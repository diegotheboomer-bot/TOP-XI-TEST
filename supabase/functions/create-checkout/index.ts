// Creates a Stripe Checkout session for the basket and returns its URL.
// Prices always come from the products table, never from the browser.
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const SHIPPING_CENTS = Number(Deno.env.get("SHIPPING_CENTS") ?? "0");

const cors = {
  "Access-Control-Allow-Origin": SITE_URL || "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (!SITE_URL) return reply({ error: "Shop is not configured" }, 500);

  let input: { items?: { id?: unknown; qty?: unknown }[]; note?: unknown };
  try {
    input = await req.json();
  } catch {
    return reply({ error: "Invalid request" }, 400);
  }

  const items = input.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) {
    return reply({ error: "Your basket is empty" }, 400);
  }
  const wanted = new Map<string, number>();
  for (const it of items) {
    const qty = Number(it.qty);
    if (typeof it.id !== "string" || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return reply({ error: "Invalid basket" }, 400);
    }
    wanted.set(it.id, (wanted.get(it.id) ?? 0) + qty);
  }
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 160) : "";

  const { data: products, error: pErr } = await db
    .from("products")
    .select("id, name, price_cents")
    .in("id", [...wanted.keys()])
    .eq("active", true);
  if (pErr) {
    console.error(pErr);
    return reply({ error: "Could not load products" }, 500);
  }
  if (!products || products.length !== wanted.size) {
    return reply({ error: "An item in your basket is not available yet" }, 400);
  }

  const lines = products.map((p) => ({ ...p, qty: wanted.get(p.id)! }));
  const amount = lines.reduce((s, l) => s + l.price_cents * l.qty, 0) + SHIPPING_CENTS;

  const { data: order, error: oErr } = await db
    .from("orders")
    .insert({
      items: lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, price_cents: l.price_cents })),
      note: note || null,
      amount_cents: amount,
    })
    .select("id")
    .single();
  if (oErr || !order) {
    console.error(oErr);
    return reply({ error: "Could not create order" }, 500);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: "eur",
          unit_amount: l.price_cents,
          product_data: { name: l.name },
        },
      })),
      shipping_address_collection: { allowed_countries: ["PT"] },
      phone_number_collection: { enabled: true },
      ...(SHIPPING_CENTS > 0 && {
        shipping_options: [{
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: "Shipping (Portugal)",
            fixed_amount: { amount: SHIPPING_CENTS, currency: "eur" },
          },
        }],
      }),
      client_reference_id: order.id,
      metadata: { order_id: order.id, note },
      success_url: `${SITE_URL}/?paid=1`,
      cancel_url: `${SITE_URL}/?cancelled=1`,
    });

    await db.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    return reply({ url: session.url });
  } catch (err) {
    console.error(err);
    await db.from("orders").update({ status: "failed" }).eq("id", order.id);
    return reply({ error: "Could not start payment" }, 502);
  }
});
