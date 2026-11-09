import Link from 'next/link';
import { isDemo } from '@/lib/env';
import { resetDemoData, signOut } from '@/actions/account';
import { Badge } from './ui/badge';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-md bg-zinc-900 text-white">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M4 17 9.5 11l4 4L20 8" />
        </svg>
      </span>
      Creator Engine
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
          <Link href="/brand" className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">
            Brands
          </Link>
          <Link href="/creator" className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">
            Creators
          </Link>
          {isDemo && (
            <form action={resetDemoData}>
              <button className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">Reset</button>
            </form>
          )}
          {signedIn && !isDemo ? (
            <form action={signOut}>
              <button className="rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900">Sign out</button>
            </form>
          ) : (
            !isDemo && (
              <Link href="/login" className="ml-1 rounded-md bg-zinc-900 px-4 py-1.5 font-medium text-white transition hover:bg-zinc-800">
                Sign in
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
