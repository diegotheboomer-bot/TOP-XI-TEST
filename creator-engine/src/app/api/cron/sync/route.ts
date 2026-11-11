import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { performMetricSyncing } from '@/lib/sync';
import { syncAllDiscordRoles } from '@/lib/discord';
import { requireEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Scheduled by vercel.json (every 4 hours). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: Request) {
  const expected = Buffer.from(`Bearer ${requireEnv('CRON_SECRET')}`);
  const given = Buffer.from(req.headers.get('authorization') ?? '');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  const report = await performMetricSyncing(admin);
  // Tier changes show up on Discord too.
  const discordRoles = await syncAllDiscordRoles(admin).catch(() => 0);
  return NextResponse.json({ ...report, discordRoles });
}
