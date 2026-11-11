import { notFound, redirect } from 'next/navigation';
import { Building2, Crown, Scissors, Sparkles, UserPlus, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

// Local testing only: one tap to sign in as a seeded test account.
// Off unless LOCAL_TEST_ACCOUNTS=1 (never set on the live site).
export const dynamic = 'force-dynamic';

const on = () => process.env.LOCAL_TEST_ACCOUNTS === '1' && !!process.env.LOCAL_TEST_PASSWORD;

const ACCOUNTS: [email: string, title: string, body: string, icon: React.ElementType][] = [
  ['streamer@atlas.test', 'Streamer (Nova Plays)', '43 campaigns, every pay model and state, ~400 clips to review. Also support admin.', Building2],
  ['agency@atlas.test', 'Agency (Peak Agency)', '8 campaigns run for named clients.', Users],
  ['newbrand@atlas.test', 'New business', 'Fresh account: welcome questions, no campaigns.', Sparkles],
  ['clipper@atlas.test', 'Clipper (Diggy, Platinum)', 'Joined campaigns, clips, money to cash out, invites waiting.', Scissors],
  ['majesty@atlas.test', 'Clipper (Majesty Max, Majesty)', 'Top tier: 148 clips, 32M views.', Crown],
  ['newclipper@atlas.test', 'New clipper', 'Fresh account: welcome questions, nothing joined.', UserPlus],
];

async function signInAs(form: FormData) {
  'use server';
  if (!on()) notFound();
  const email = String(form.get('email'));
  if (!email.endsWith('@atlas.test')) notFound();
  const supabase = createClient();
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email, password: process.env.LOCAL_TEST_PASSWORD! });
  if (error) throw new Error(error.message);
  redirect('/');
}

export default function DevAccounts() {
  if (!on()) notFound();
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Test accounts</h1>
      <p className="mt-1 text-sm text-zinc-500">Local test data only. Tap one to sign in as it. Come back here to switch.</p>
      <div className="mt-6 space-y-2">
        {ACCOUNTS.map(([email, title, body, Icon]) => (
          <form key={email} action={signInAs}>
            <input type="hidden" name="email" value={email} />
            <button type="submit" className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-300 active:scale-[0.99]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{title}</span>
                <span className="block text-xs text-zinc-500">{body}</span>
                <span className="block font-mono text-[11px] text-zinc-400">{email}</span>
              </span>
            </button>
          </form>
        ))}
      </div>
      <p className="mt-6 text-xs text-zinc-500">Also 300+ more: clipper1@atlas.test … clipper320@atlas.test and brand1@ … brand14@atlas.test, same password.</p>
    </main>
  );
}
