import type { LinkLike } from './views';
import { cn } from './ui/cn';
import { Badge } from './ui/badge';
import { Logo as BrandLogo } from './logo';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Extra path prefixes that should highlight this item. */
  also?: string[];
  count?: number;
}
export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Picks the nav item whose href (or alias) is the longest prefix of the current path. */
export function activeHref(sections: NavSection[], path: string): string | null {
  let best: { href: string; len: number } | null = null;
  for (const item of sections.flatMap((s) => s.items)) {
    for (const p of [item.href, ...(item.also ?? [])]) {
      if ((path === p || path.startsWith(p.endsWith('/') ? p : p + '/')) && (!best || p.length > best.len)) best = { href: item.href, len: p.length };
    }
  }
  return best?.href ?? null;
}

function Logo({ link: Link, href }: { link: LinkLike; href: string }) {
  return (
    <Link href={href} aria-label="Creator Engine home">
      <BrandLogo />
    </Link>
  );
}

/**
 * App frame: a sidebar on wide screens, a top bar with scrolling tabs on phones.
 * `footer` sits at the bottom of the sidebar (and at the end of the tab row on phones).
 */
export function AppShell({
  sections,
  current,
  link = 'a',
  homeHref,
  demo,
  footer,
  children,
}: {
  sections: NavSection[];
  current: string | null;
  link?: LinkLike;
  homeHref: string;
  demo?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const Link = link;
  const items = sections.flatMap((s) => s.items);
  const navLink = (item: NavItem, mobile: boolean) => {
    const on = item.href === current;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 rounded-md text-sm transition-colors [&>svg]:size-4 [&>svg]:shrink-0',
          mobile ? 'shrink-0 px-3 py-1.5' : 'px-2.5 py-2',
          on ? 'bg-brand-a/15 font-medium text-zinc-900 ring-1 ring-inset ring-brand-a/30' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
        )}
      >
        {item.icon}
        <span className="truncate">{item.label}</span>
        {!!item.count && <span className={cn('ml-auto rounded px-1.5 text-xs tabular-nums', on ? 'bg-brand-a/25' : 'bg-amber-50 text-amber-700')}>{item.count}</span>}
      </Link>
    );
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-zinc-200/80 bg-white px-3 py-5 lg:flex">
        <div className="px-2.5">
          <Logo link={Link} href={homeHref} />
          {demo && (
            <Badge tone="amber" className="mt-3">
              Demo · mock money
            </Badge>
          )}
        </div>
        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto">
          {sections.map((s) => (
            <div key={s.title}>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">{s.title}</p>
              <div className="space-y-0.5">{s.items.map((i) => navLink(i, false))}</div>
            </div>
          ))}
        </nav>
        {footer && <div className="border-t border-zinc-100 px-1 pt-3">{footer}</div>}
      </aside>

      <header className="site-header sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur lg:hidden">
        <div className="gutter flex h-14 items-center justify-between gap-3">
          <Logo link={Link} href={homeHref} />
          {demo && <Badge tone="amber">Demo</Badge>}
        </div>
        <nav className="gutter flex gap-1 overflow-x-auto pb-2.5 [scrollbar-width:none]">
          {items.map((i) => navLink(i, true))}
          {footer && <div className="ml-auto shrink-0">{footer}</div>}
        </nav>
      </header>

      <main className="gutter mx-auto w-full max-w-6xl py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
