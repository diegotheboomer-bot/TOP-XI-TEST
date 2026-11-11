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
  /** The main action (e.g. New campaign): a volt button, raised in the phone tab bar. */
  primary?: boolean;
  /** Shown after the label in the sidebar, e.g. the clipper's tier. */
  badge?: React.ReactNode;
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
    <Link href={href} aria-label="Atlas Clips home">
      <BrandLogo />
    </Link>
  );
}

/**
 * App frame: a sidebar on wide screens; on phones a slim top bar and an app-style tab bar at the bottom.
 * `footer` sits at the bottom of the sidebar (and as icons in the phone top bar).
 */
export function AppShell({
  sections,
  current,
  link = 'a',
  homeHref,
  demo,
  footer,
  account,
  children,
}: {
  /** The account menu (picture, top right). */
  account?: React.ReactNode;
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
  const navLink = (item: NavItem) => {
    const on = item.href === current;
    if (item.primary) {
      return (
        <Link
          key={item.href}
          href={item.href}
          className="platform-tile relative flex items-center gap-2.5 overflow-hidden rounded-lg bg-brand px-2.5 py-2 text-sm font-semibold text-brand-ink shadow-[0_6px_20px_-8px_rgb(var(--brand-b)/0.8)] transition hover:brightness-110 [&>svg]:relative [&>svg]:size-4"
        >
          {item.icon}
          <span className="relative">{item.label}</span>
        </Link>
      );
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors [&>svg]:size-4 [&>svg]:shrink-0',
          on ? 'bg-brand-a/15 font-medium text-zinc-900 ring-1 ring-inset ring-brand-a/30' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
        )}
      >
        {item.icon}
        <span className="truncate">{item.label}</span>
        {item.badge && <span className="ml-auto">{item.badge}</span>}
        {!!item.count && <span className={cn('ml-auto rounded px-1.5 text-xs tabular-nums', on ? 'bg-brand-a/25' : 'bg-amber-50 text-amber-700')}>{item.count}</span>}
      </Link>
    );
  };

  /** Phone tab bar item: icon over a short label; the primary one gets a volt pill. */
  const tab = (item: NavItem) => {
    const on = item.href === current;
    const label = item.label.replace('New campaign', 'New');
    if (item.primary) {
      return (
        <Link key={item.href} href={item.href} aria-label={item.label} className="flex flex-1 flex-col items-center gap-1 pt-2 text-[10.5px] font-semibold text-zinc-900">
          <span className="platform-tile relative grid h-8 w-12 place-items-center overflow-hidden rounded-full bg-brand text-brand-ink shadow-[0_6px_16px_-6px_rgb(var(--brand-b)/0.9)] transition active:scale-95 [&>svg]:relative [&>svg]:size-[18px]">
            {item.icon}
          </span>
          {label}
        </Link>
      );
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={on ? 'page' : undefined}
        className={cn('relative flex flex-1 flex-col items-center gap-1 pt-2 text-[10.5px] font-medium transition-colors [&>svg]:size-[22px]', on ? 'text-zinc-900' : 'text-zinc-400')}
      >
        {on && <span className="absolute top-0 h-[3px] w-8 rounded-full bg-brand" />}
        <span className={cn('grid h-8 w-12 place-items-center rounded-full transition [&>svg]:size-[20px]', on && 'bg-brand-a/15 text-[rgb(var(--brand-ta))]')}>{item.icon}</span>
        {label}
        {!!item.count && <span className="absolute right-[22%] top-1 grid min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">{item.count}</span>}
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
              <div className="space-y-1">{s.items.map((i) => navLink(i))}</div>
            </div>
          ))}
        </nav>
        {footer && <div className="border-t border-zinc-100 px-1 pt-3">{footer}</div>}
      </aside>

      <header className="site-header sticky top-0 z-20 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl lg:hidden">
        <div className="gutter flex h-14 items-center justify-between gap-3">
          <Logo link={Link} href={homeHref} />
          <div className="flex items-center gap-1">
            {demo && <Badge tone="amber">Demo</Badge>}
            {account ?? (
              <>
                {items
                  .filter((i) => i.badge)
                  .map((i) => (
                    <Link key={i.href} href={i.href} aria-label={i.label} className="mr-1">
                      {i.badge}
                    </Link>
                  ))}
                {footer}
              </>
            )}
          </div>
        </div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/80 bg-white/90 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-end px-2">
          {(items.length > 5 ? items.slice(0, 4) : items).map(tab)}
          {items.length > 5 && <MoreTab items={items.slice(4)} current={current} link={Link} />}
        </div>
      </nav>

      <main className="gutter mx-auto w-full max-w-6xl pb-28 pt-6 lg:px-10 lg:py-10">
        {account && <div className="relative z-20 -mb-2 hidden justify-end lg:-mt-4 lg:flex">{account}</div>}
        {children}
      </main>
    </div>
  );
}

/** Phone tab bar overflow: a "More" tab that opens a small menu with the rest. */
function MoreTab({ items, current, link: Link }: { items: NavItem[]; current: string | null; link: LinkLike }) {
  const on = items.some((i) => i.href === current);
  return (
    <details className="group relative flex flex-1 [&::-webkit-details-marker]:hidden">
      <summary
        className={cn('relative flex flex-1 cursor-pointer list-none flex-col items-center gap-1 pt-2 text-[10.5px] font-medium [&::-webkit-details-marker]:hidden', on ? 'text-zinc-900' : 'text-zinc-400')}
      >
        {on && <span className="absolute top-0 h-[3px] w-8 rounded-full bg-brand" />}
        <span className={cn('grid h-8 w-12 place-items-center rounded-full', on && 'bg-brand-a/15 text-[rgb(var(--brand-ta))]')}>
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </span>
        More
      </summary>
      <div className="absolute bottom-full right-0 mb-3 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition [&>svg]:size-4', i.href === current ? 'bg-brand-a/15 font-medium' : 'hover:bg-zinc-100')}
          >
            {i.icon}
            <span className="flex-1">{i.label}</span>
            {i.badge}
          </Link>
        ))}
      </div>
    </details>
  );
}
