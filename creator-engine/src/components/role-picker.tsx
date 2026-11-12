// "How will you use it?" — the first choice a new visitor makes. Shared by the
// Next app (/start) and the standalone demo (#start).
import { ArrowRight, Building2, Check } from 'lucide-react';
import type { LinkLike } from './views';
import { buttonClass } from './ui/button';

const ROLES = [
  {
    key: 'streamer',
    title: 'I want clips',
    lead: 'For streamers, brands, musicians, studios and agencies. Clippers turn your content into short videos; you pay only for real views.',
    photo: 'stage-lights.jpg',
    points: ['Set a rate and a budget', 'Share your content and rules', 'Approve clips; we pay clippers'],
    cta: 'Get clips',
  },
  {
    key: 'clipper',
    title: 'I clip',
    lead: 'Clip creators and brands you like, post on TikTok, Shorts or Reels, and get paid for the views.',
    photo: 'couch-coop.jpg',
    points: ['Pick a campaign', 'Clip a moment and post it', 'Get paid per 1,000 views, and just 2% on cash-out'],
    cta: 'Start clipping',
  },
] as const;

export function RolePicker({
  link: Link = 'a',
  streamerHref,
  clipperHref,
  agencyHref,
  assetBase,
}: {
  /** Agencies running campaigns for streamers they manage. */
  agencyHref?: string;
  link?: LinkLike;
  streamerHref: string;
  clipperHref: string;
  assetBase: string;
}) {
  return (
    <main className="gutter mx-auto max-w-4xl py-12 sm:py-16">
      <h1 className="balance text-center text-3xl font-semibold tracking-tight sm:text-4xl">How will you use Atlas Clips?</h1>
      <p className="mx-auto mt-3 max-w-md text-center text-zinc-600">Pick one to get started. You can switch later.</p>
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {ROLES.map((r) => (
          <Link
            key={r.key}
            href={r.key === 'streamer' ? streamerHref : clipperHref}
            className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-card transition hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <div className="relative aspect-[16/7] overflow-hidden bg-zinc-100">
              <img src={`${assetBase}${r.photo}`} alt="" className="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-[1.02]" />
            </div>
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <h2 className="text-xl font-semibold tracking-tight">{r.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{r.lead}</p>
              <ul className="mt-4 space-y-2">
                {r.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-600" />
                    {p}
                  </li>
                ))}
              </ul>
              <span className={buttonClass('primary', 'md', 'mt-6 w-full')}>{r.cta}</span>
            </div>
          </Link>
        ))}
      </div>
      {agencyHref && (
        <Link
          href={agencyHref}
          className="group mt-5 flex items-center gap-4 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-card transition hover:border-zinc-400 sm:p-6"
        >
          <span className="platform-tile relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand text-brand-ink">
            <Building2 className="relative size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold tracking-tight">I run an agency</span>
            <span className="block text-sm text-zinc-600">Run clipping campaigns for the streamers you manage, all from one account.</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-zinc-900" />
        </Link>
      )}
    </main>
  );
}
