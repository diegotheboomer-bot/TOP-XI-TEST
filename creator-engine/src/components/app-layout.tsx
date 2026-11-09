import { Compass, House, LayoutList, LogOut, Plus, RotateCcw } from 'lucide-react';
import { isDemo } from '@/lib/env';
import { getViewer } from '@/lib/session';
import { resetDemoData, signOut } from '@/actions/account';
import { NextShell } from './next-shell';
import type { NavSection } from './app-shell';

const BRAND: NavSection = {
  title: 'Brand',
  items: [
    { href: '/brand', label: 'Campaigns', icon: <LayoutList />, also: ['/brand/campaigns'] },
    { href: '/brand/campaigns/new', label: 'New campaign', icon: <Plus /> },
  ],
};
const CREATOR: NavSection = {
  title: 'Creator',
  items: [
    { href: '/creator', label: 'Home', icon: <House /> },
    { href: '/creator/discover', label: 'Discover', icon: <Compass />, also: ['/creator/campaigns'] },
  ],
};

const footerButton = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 [&>svg]:size-4';

/** Sidebar layout for /brand and /creator. The demo shows both sides; a real account sees its own. */
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
