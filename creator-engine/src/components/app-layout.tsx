import Link from 'next/link';
import { ArrowLeftRight, Compass, House, LayoutList, LogOut, Plus, RotateCcw, Wallet, Clapperboard, ChartColumn, CircleUser, FolderOpen, LifeBuoy, Settings, Telescope, Users, Gift } from 'lucide-react';
import { isDemo } from '@/lib/env';
import { cookies, headers } from 'next/headers';
import { signupFingerprint } from '@/lib/referrals';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEVICE_COOKIE, deviceHash, recordDevice } from '@/lib/device';
import { resetDemoData, signOut } from '@/actions/account';
import { NextShell } from './next-shell';
import { TierBadge } from './tier-badge';
import { getAccountSummary, getMyTier } from '@/lib/data';
import { AccountMenu } from './account-menu';
import type { NavSection } from './app-shell';

export type Role = 'streamer' | 'clipper';

const SECTIONS: Record<Role, NavSection[]> = {
  streamer: [
    {
      title: 'Campaigns',
      items: [
        { href: '/streamer/campaigns/new', label: 'New campaign', icon: <Plus />, primary: true },
        { href: '/streamer', label: 'Campaigns', icon: <LayoutList />, also: ['/streamer/campaigns'] },
        { href: '/streamer/creators', label: 'Creators', icon: <Users /> },
        ...(process.env.SCOUT_ENABLED?.trim() === 'true' ? [{ href: '/streamer/scout', label: 'Scout', icon: <Telescope /> }] : []),
      ],
    },
    {
      title: 'Insights & money',
      items: [
        { href: '/streamer/stats', label: 'Stats', icon: <ChartColumn /> },
        { href: '/streamer/money', label: 'Money', icon: <Wallet /> },
        { href: '/streamer/invite', label: 'Invite & earn', icon: <Gift /> },
      ],
    },
    {
      title: 'Account',
      items: [
        { href: '/account', label: 'Settings', icon: <Settings /> },
        { href: '/support', label: 'Support', icon: <LifeBuoy /> },
      ],
    },
  ],
  clipper: [
    {
      title: 'Clipping',
      items: [
        { href: '/clipper', label: 'Home', icon: <House /> },
        { href: '/clipper/discover', label: 'Discover', icon: <Compass /> },
        { href: '/clipper/campaigns', label: 'Campaigns', icon: <FolderOpen /> },
        { href: '/clipper/clips', label: 'Clips', icon: <Clapperboard /> },
      ],
    },
    {
      title: 'Money',
      items: [
        { href: '/clipper/earnings', label: 'Earnings', icon: <ChartColumn /> },
        { href: '/clipper/payouts', label: 'Payouts', icon: <Wallet /> },
        { href: '/clipper/invite', label: 'Invite & earn', icon: <Gift /> },
      ],
    },
    {
      title: 'Account',
      items: [
        { href: '/clipper/profile', label: 'Profile', icon: <CircleUser /> },
        { href: '/account', label: 'Settings', icon: <Settings /> },
        { href: '/support', label: 'Support', icon: <LifeBuoy /> },
      ],
    },
  ],
};

const footerItem = 'flex items-center gap-2 rounded-lg p-2 text-sm lg:w-full lg:px-2.5 lg:py-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 [&>svg]:size-4';

/** Sidebar layout for /streamer and /clipper. Each side only shows its own menu. */
export async function AppLayout({ role, children }: { role: Role; children: React.ReactNode }) {
  const [tier, me, viewer] = await Promise.all([role === 'clipper' ? getMyTier() : null, getAccountSummary(), getViewer()]);
  // Remember this device for the account (invite anti-fraud).
  if (viewer && !isDemo) await recordDevice(createAdminClient(), viewer.userId, deviceHash(cookies().get(DEVICE_COOKIE)?.value), signupFingerprint(headers().get('x-forwarded-for') ?? headers().get('x-real-ip')));
  const sections: NavSection[] = SECTIONS[role].map((sec) => ({
    ...sec,
    items: sec.items.map((i) => (tier && i.href === '/clipper/profile' ? { ...i, badge: <TierBadge tier={tier} /> } : i)),
  }));
  const other: Role = role === 'streamer' ? 'clipper' : 'streamer';
  const footer = isDemo ? (
    <div className="flex gap-1 lg:block lg:space-y-0.5">
      <Link href={`/${other}`} className={footerItem} aria-label={`Switch to ${other} view`}>
        <ArrowLeftRight /> <span className="hidden lg:inline">Switch to {other} view</span>
      </Link>
      <form action={resetDemoData}>
        <button className={footerItem} aria-label="Reset demo">
          <RotateCcw /> <span className="hidden lg:inline">Reset demo</span>
        </button>
      </form>
    </div>
  ) : (
    <div className="flex gap-1 lg:block lg:space-y-0.5">
      <form action={signOut}>
        <button className={footerItem} aria-label="Sign out">
          <LogOut /> <span className="hidden lg:inline">Sign out</span>
        </button>
      </form>
    </div>
  );
  return (
    <NextShell sections={sections} demo={isDemo} footer={me ? undefined : footer} account={me ? <AccountMenu me={me} clipper={role === 'clipper'} signOut={signOut} /> : undefined}
      accountPhone={me ? <AccountMenu me={me} clipper={role === 'clipper'} signOut={signOut} small /> : undefined}
    >
      {children}
    </NextShell>
  );
}
