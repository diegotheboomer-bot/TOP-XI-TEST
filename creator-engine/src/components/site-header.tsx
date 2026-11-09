import Link from 'next/link';
import { isDemo } from '@/lib/env';
import { signOut } from '@/actions/account';
import { Badge } from './ui/badge';
import { ThemeToggle } from './theme-toggle';
import { Logo as BrandLogo } from './logo';

export function Logo() {
  return (
    <Link href="/" aria-label="Atlas Clips home">
      <BrandLogo />
    </Link>
  );
}

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur">
      <div className="gutter mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo />
          {isDemo && <Badge tone="amber" className="hidden sm:inline-flex">Demo · mock money</Badge>}
        </div>
        <nav className="flex items-center gap-1 text-sm">
          <ThemeToggle labelled={false} />
          {!isDemo && !signedIn && (
            <Link href="/login" className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">
              Sign in
            </Link>
          )}
          {signedIn && !isDemo ? (
            <form action={signOut}>
              <button className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">Sign out</button>
            </form>
          ) : (
            <Link href="/start" className="ml-1 rounded-md bg-brand px-4 py-1.5 font-medium text-brand-ink transition hover:brightness-110">
              Get started
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
