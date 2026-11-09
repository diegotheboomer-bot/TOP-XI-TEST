import { Compass, House, LayoutList, LogOut, Plus, RotateCcw } from 'lucide-react';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { resetDemoData, signOut } from '@/actions/account';
import { NextShell } from './next-shell';
import type { NavSection } from './app-shell';

const BRAND: NavSection = {
  title: 'Streamer',
  items: [
    { href: '/streamer', label: 'Campaigns', icon: <LayoutList />, also: ['/streamer/campaigns'] },
    { href: '/streamer/campaigns/new', label: 'New campaign', icon: <Plus /> },
  ],
};
const CREATOR: NavSection = {
  title: 'Clipper',
  items: [
    { href: '/clipper', label: 'Home', icon: <House /> },
    { href: '/clipper/discover', label: 'Discover', icon: <Compass />, also: ['/clipper/campaigns'] },
  ],
};

const footerButton = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 [&>svg]:size-4';

/** Sidebar layout for /streamer and /clipper. The demo shows both sides; a real account sees its own. */
export async function AppLayout({ children }: { children: React.ReactNode }) {
  let sections: NavSection[] = [BRAND, CREATOR];
  if (!isDemo) {
    const viewer = await getViewer();
    sections = viewer?.brandId ? [BRAND] : [CREATOR];
  }
  const footer = isDemo ? (
    <form action={resetDemoData}>
      <button className={footerButton}>
        <RotateCcw /> Reset demo
      </button>
    </form>
  ) : (
    <form action={signOut}>
      <button className={footerButton}>
        <LogOut /> Sign out
      </button>
    </form>
  );
  return (
    <NextShell sections={sections} demo={isDemo} footer={footer}>
      {children}
    </NextShell>
  );
}
