import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

interface ShopifyOrder {
  id: number;
  total_price: string;
  currency: string;
  landing_site?: string | null;
  discount_codes?: { code: string }[];
  note_attributes?: { name: string; value: string }[];
}

/** Shopify `orders/create` webhook → conversion attributed by discount code or ?ref= landing param. */
export async function POST(req: Request) {
  const raw = await req.text();
  const digest = createHmac('sha256', requireEnv('SHOPIFY_WEBHOOK_SECRET')).update(raw, 'utf8').digest();
  const given = Buffer.from(req.headers.get('x-shopify-hmac-sha256') ?? '', 'base64');
  if (given.length !== digest.length || !timingSafeEqual(given, digest)) {
    return NextResponse.json({ error: 'invalid hmac' }, { status: 401 });
  }

  const shop = req.headers.get('x-shopify-shop-domain')?.toLowerCase();
  const order = JSON.parse(raw) as ShopifyOrder;
  const admin = createAdminClient();

  const codes = (order.discount_codes ?? []).map((d) => d.code.toUpperCase());
  const ref = refFrom(order);

  let match: { enrollmentId: string; campaignId: string; by: 'discount_code' | 'ref_param' } | null = null;
  if (codes.length) {
    const { data } = await admin.from('campaign_creators').select('id, campaign_id').in('discount_code', codes).limit(1).maybeSingle();
    if (data) match = { enrollmentId: data.id, campaignId: data.campaign_id, by: 'discount_code' };
  }
  if (!match && ref) {
    const { data } = await admin.from('campaign_creators').select('id, campaign_id').eq('ref_param', ref).maybeSingle();
    if (data) match = { enrollmentId: data.id, campaignId: data.campaign_id, by: 'ref_param' };
  }
  if (!match) return NextResponse.json({ attributed: false });

  // The order must come from the store connected to that campaign.
  const { data: campaign } = await admin.from('campaigns').select('conversion_pixels(shop_domain)').eq('id', match.campaignId).single();
  const pixel = campaign?.conversion_pixels as unknown as { shop_domain: string | null } | null;
  if (!shop || pixel?.shop_domain !== shop) return NextResponse.json({ attributed: false });

  const { error } = await admin.from('conversions').insert({
    campaign_id: match.campaignId,
    campaign_creator_id: match.enrollmentId,
    external_order_id: String(order.id),
    order_total: Number(order.total_price),
    currency: order.currency,
    matched_by: match.by,
  });
  if (error && error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 });

  // Keep the creator's submission counter in step.
  const [{ count }, { data: enrollment }] = await Promise.all([
    admin.from('conversions').select('id', { count: 'exact', head: true }).eq('campaign_creator_id', match.enrollmentId),
    admin.from('campaign_creators').select('creator_id').eq('id', match.enrollmentId).single(),
  ]);
  if (enrollment) {
    await admin.from('submissions').update({ current_conversions: count ?? 0 }).eq('campaign_id', match.campaignId).eq('creator_id', enrollment.creator_id);
  }
  return NextResponse.json({ attributed: true });
}

function refFrom(order: ShopifyOrder): string | null {
  const attr = order.note_attributes?.find((a) => a.name === 'ref')?.value;
  if (attr) return attr;
  if (!order.landing_site) return null;
  try {
    return new URL(order.landing_site, 'https://shop.invalid').searchParams.get('ref');
  } catch {
    return null;
  }
}
