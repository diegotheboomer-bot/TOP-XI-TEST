'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppShell, activeHref, type NavSection } from './app-shell';

export function NextShell(props: { sections: NavSection[]; demo: boolean; footer?: React.ReactNode; account?: React.ReactNode; children: React.ReactNode }) {
  const path = usePathname();
  return <AppShell {...props} current={activeHref(props.sections, path)} link={Link} homeHref="/" />;
}
