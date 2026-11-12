import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, ExternalLink, PartyPopper, Upload, Users, Wallet } from 'lucide-react';
import { SubmissionBadge } from '@/components/status';
import { TierBadge } from '@/components/tier-badge';
import { getCreatorCampaign } from '@/lib/data';
import { compact, platformRates, rateParts, usd, usdCents, usdCompact } from '@/lib/format';
import { contentTypeLabel } from '@/lib/campaign-tags';
import { PlatformIcon } from '@/components/platform-icon';
import type { Platform } from '@/lib/types';
import { claimMoment, connectInstagram, connectTikTok, joinCampaign } from '@/actions/creator';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/action-button';
import { YouTubeVerify } from '@/components/forms/youtube-verify';
import { SubmitVideoForm } from '@/components/forms/submit-video-form';
import { VerifiedMark, CampaignCover, MomentBoard, NextStep, PlatformChips, ReferenceList, RequirementList, StreamerAvatar } from '@/components/views';

import { StickyAction } from '@/components/sticky-post-button';

export const dynamic = 'force-dynamic';

export default async function ClipperCampaignPage({ params }: { params: { id: string } }) {
  const d = await getCreatorCampaign(params.id);
  if (!d) notFound();
  const { campaign: c } = d;
  const r = rateParts(c);

  const split = platformRates(c);
  const mine = d.submissions ?? (d.submission ? [d.submission] : []);
  const limit = c.max_clips_per_clipper ?? null;
  const canPostMore = !limit || mine.length < limit;
  const used = c.budget.deposited > 0 ? Math.min(100, (c.budget.committed / c.budget.deposited) * 100) : 0;

  return (
    <div className="space-y-5 pb-16 sm:space-y-6 lg:pb-0">
      {/* Phones: the one action that matters, always in reach above the tab bar. */}
      {(!d.enrollment || canPostMore) && (
        <StickyAction target="post">
          {d.enrollment ? (
            <a href="#post" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-base font-semibold text-brand-ink shadow-[0_12px_30px_-10px_rgb(0_0_0/0.6)]">
              <Upload className="size-4" /> {mine.length ? 'Post another clip' : 'Post a clip'}
            </a>
          ) : (
            <div className="[&_button]:h-12 [&_button]:w-full [&_button]:rounded-2xl [&_button]:text-base [&_button]:shadow-[0_12px_30px_-10px_rgb(0_0_0/0.6)]">
              <ActionButton variant="primary" block action={joinCampaign.bind(null, c.id)}>
                Join campaign · it’s free
              </ActionButton>
            </div>
          )}
        </StickyAction>
      )}
      <Link href="/clipper/discover" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Discover
      </Link>


      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
          {/* Hero: cover, who, what, and how busy it is. */}
          <section className="order-first overflow-hidden rounded-2xl lg:order-none lg:col-start-1 lg:row-start-1 border border-zinc-200/80 bg-white shadow-card">
            <CampaignCover campaign={c} brandName={c.brandName} variant="card" showTitle={false} className="max-sm:aspect-[2/1]" />
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                <StreamerAvatar name={c.brandName} src={c.brandAvatar} />
                <span className="font-medium text-zinc-900">{c.brandName}</span>
                {c.brandVerified && <VerifiedMark />}
                {c.agencyName && <span className="text-xs text-zinc-500">via {c.agencyName}</span>}
                {c.min_tier && c.min_tier !== 'silver' && <TierBadge tier={c.min_tier} />}
                {c.category && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-ink">{c.category}</span>}
                {(c.content_types ?? []).map((t) => (
                  <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                    {contentTypeLabel(t)}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <h1 className="balance min-w-0 text-xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
                <PlatformChips platforms={c.platforms} className="mt-1 hidden shrink-0 sm:flex" />
              </div>

              {/* Pay, numbers and budget in one strip */}
              <div className="relative -mx-4 -mb-4 mt-2 rounded-b-2xl p-4 sm:-mx-6 sm:-mb-6 sm:p-5">
                {/* Soft green glow that fades in, no hard edge */}
                <div aria-hidden className="pointer-events-none absolute -top-40 left-0 h-80 w-full" style={{ background: 'radial-gradient(60% 50% at 15% 50%, rgb(var(--brand-a) / 0.13), transparent 75%)' }} />
                <p className="relative text-[11px] font-medium uppercase tracking-wider text-zinc-500">You earn</p>
                <div className="relative mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{r.rate}</span>
                    <span className="text-sm text-zinc-500">{r.unit}</span>
                  </p>
                  {split.length > 0 && (
                    <span className="flex gap-2 text-xs text-zinc-500">
                      {split.map((p) => (
                        <span key={p.platform} className="inline-flex items-center gap-1">
                          <PlatformIcon platform={p.platform as Platform} className="size-3" />
                          {usdCents(p.rate)}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                {/* Four soft tiles: separated, but part of the same card */}
                <dl className="relative mt-4 grid grid-cols-4 gap-1.5 sm:gap-2">
                  {(
                    [
                      ['Max / clip', c.payout_model === 'pool' ? '—' : usdCompact(c.cpm_cap)],
                      ['Min payout', Number(c.min_payout) > 0 ? usd(Number(c.min_payout)) : 'None'],
                      ['Clippers', String(c.creators)],
                      ['Approved', String(d.approvedClips ?? 0)],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="flex flex-col-reverse rounded-xl bg-zinc-100/60 px-2.5 py-2.5 ring-1 ring-inset ring-zinc-200/50 sm:px-3.5 sm:py-3">
                      <dt className="truncate text-[10px] text-zinc-500 sm:text-[11px]">{k}</dt>
                      <dd className="text-[15px] font-semibold tabular-nums tracking-tight sm:text-lg">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="relative mt-5">
                  {c.payout_model === 'pool' ? (
                    <PoolBar shares={d.poolShares ?? []} pool={c.budget.deposited} />
                  ) : (
                    <>
                  <p className="mb-2 flex items-baseline justify-between text-sm">
                    <span className="font-medium">Budget used</span>
                    <span className="tabular-nums text-zinc-500">
                      <b className="font-semibold text-zinc-900">{Math.round(used)}%</b> · {usdCompact(c.budget.committed)} of {usdCompact(c.budget.deposited)}
                    </span>
                  </p>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-brand shadow-[0_0_12px_rgb(var(--brand-b)/0.6)]" style={{ width: `${Math.max(used, 1.5)}%` }} />
                  </div>
                    </>
                  )}
                  <p className="mt-2 flex justify-between text-xs text-zinc-500">
                    <span>{c.payout_model === 'pool' ? 'Paid out when the campaign ends' : `${usdCompact(c.budget.available)} left to earn`}</span>
                    <span className="flex gap-1.5 sm:hidden">
                      {c.platforms.map((p) => (
                        <PlatformIcon key={p} platform={p} className="size-3" />
                      ))}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>
        <div className="order-last min-w-0 space-y-6 lg:order-none lg:col-start-1 lg:row-start-2">

          {c.brief && (
            <section>
              <h2 className="mb-2 font-semibold tracking-tight">What {c.brandName} wants</h2>
              <p className="max-w-prose whitespace-pre-line leading-relaxed text-zinc-600">{c.brief}</p>
            </section>
          )}
          {c.requirements.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold tracking-tight">Rules for your clip</h2>
              <RequirementList items={c.requirements} />
            </section>
          )}
          {(c.asset_folder_url || (c.reference_items?.length ?? 0) > 0) && (
            <section>
              <h2 className="mb-3 font-semibold tracking-tight">References</h2>
              <ReferenceList campaign={c} />
            </section>
          )}
          {c.moments_enabled && (
            <section>
              <h2 className="mb-1 font-semibold tracking-tight">Moments to clip</h2>
              <p className="mb-4 text-sm text-zinc-500">Claim one before you cut it, so clips stay varied.</p>
            <MomentBoard
              moments={d.moments}
              empty="No moments pinned yet. Anything from the streams is fair game."
              action={(m) =>
                m.mine ? (
                  <Badge tone="green">Yours</Badge>
                ) : m.claimed_by.length >= m.max_claims ? (
                  <Badge>Full</Badge>
                ) : d.enrollment ? (
                  <ActionButton action={claimMoment.bind(null, m.id)}>Claim</ActionButton>
                ) : (
                  <span className="text-xs text-zinc-400">Join to claim</span>
                )
              }
            />
            </section>
          )}
          <section>
            <h2 className="mb-2 font-semibold tracking-tight">How you get paid</h2>
            <ul className="max-w-prose list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-600">
              <li>Views are read from TikTok and YouTube every 4 hours. Screenshots and self-reported numbers aren’t accepted.</li>
              {c.payout_model === 'hybrid' && (
                <li>
                  {usd(c.base_payout)} once your clip is approved, plus {r.rate} {r.unit}.
                </li>
              )}
              <li>Each clip earns up to {usd(c.cpm_cap)}{Number(c.min_payout) > 0 && <>, and starts paying once it reaches {usd(Number(c.min_payout))}</>}. When you cash out, a 2% fee and Stripe’s payout fee come off.</li>
              <li>{c.brandName} reviews and approves every clip. Once approved, you’re paid automatically.</li>
            </ul>
          </section>
        </div>

        <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-8 lg:self-start">
          {d.enrollment && mine.length === 0 && (
            <a href="#post" className="flex items-center gap-3 rounded-2xl bg-brand px-4 py-3.5 text-brand-ink shadow-[0_10px_30px_-12px_rgb(var(--brand-b)/0.8)] transition hover:brightness-110">
              <PartyPopper className="size-5 shrink-0" />
              <span className="min-w-0 flex-1 text-sm">
                <b className="font-semibold">You’re in!</b> Post your first clip to start earning.
              </span>
              <span className="shrink-0 text-sm font-semibold">Post →</span>
            </a>
          )}

          {mine.length > 0 && (
            <Card>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-semibold tracking-tight">Your clips</h2>
                <span className="text-xs text-zinc-500">{limit ? `${mine.length} of ${limit}` : `${mine.length} posted`}</span>
              </div>
              <ul className="divide-y divide-zinc-100">
                {mine.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <PlatformIcon platform={s.platform} className="size-4 shrink-0 text-zinc-400" />
                    <div className="min-w-0 flex-1">
                      <SubmissionBadge status={s.status} />
                      <p className="mt-0.5 text-xs text-zinc-500">{compact(s.current_view_count)} views</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{usd(s.payout_earned)}</span>
                    <a href={s.video_url} target="_blank" rel="noreferrer" aria-label="Watch" className="grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900">
                      <ExternalLink className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card id="post" className="scroll-mt-24">
            {mine.length > 0 && canPostMore && <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[rgb(var(--brand-ta))]">Post another clip</p>}
            <NextStep
              campaign={c}
              brandName={c.brandName}
              enrollment={d.enrollment}
              submission={canPostMore ? null : d.submission}
              claimedMoment={d.moments.find((m) => m.mine)?.title ?? null}
              join={
                <ActionButton variant="primary" block action={joinCampaign.bind(null, c.id)}>
                  Join campaign
                </ActionButton>
              }
              submitForm={<SubmitVideoForm campaignId={c.id} />}
              tiktokPrompt={
                (c.platforms.includes('tiktok') && !d.tiktokConnected) || (c.platforms.includes('youtube') && !d.youtubeVerified) || (c.platforms.includes('instagram') && !d.instagramConnected) ? (
                  <div className="space-y-2">
                    {c.platforms.includes('tiktok') && !d.tiktokConnected && (
                      <form action={connectTikTok} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
                        <span>Posting on TikTok? Connect it first so we know the clips are yours.</span>
                        <Button size="sm" variant="secondary">
                          Connect
                        </Button>
                      </form>
                    )}
                    {c.platforms.includes('instagram') && !d.instagramConnected && (
                      <form action={connectInstagram} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
                        <span>Posting Reels? Connect your Instagram (Creator or Business account) first.</span>
                        <Button size="sm" variant="secondary">
                          Connect
                        </Button>
                      </form>
                    )}
                    {c.platforms.includes('youtube') && !d.youtubeVerified && (
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
                        <span>Posting Shorts? Connect your YouTube channel first.</span>
                        <YouTubeVerify code={d.youtubeCode} verified={false} />
                      </div>
                    )}
                  </div>
                ) : undefined
              }
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="px-2 py-3">
      <dt className="flex items-center justify-center gap-1 text-[11px] text-zinc-500 [&>svg]:size-3.5">
        {icon}
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Pool campaigns: one bar split by each clipper's share of approved views; your slice is highlighted. */
function PoolBar({ shares, pool }: { shares: { mine: boolean; views: number; share: number }[]; pool: number }) {
  const mine = shares.find((s) => s.mine);
  // The 12 biggest slices, plus yours if it's smaller; everyone else shares one faint slice.
  const top = shares.filter((s, i) => i < 12 || s.mine);
  const rest = shares.filter((s, i) => i >= 12 && !s.mine).reduce((n, s) => n + s.share, 0);
  return (
    <>
      <p className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium">Pool split</span>
        <span className="tabular-nums text-zinc-500">
          {shares.length} {shares.length === 1 ? 'clipper' : 'clippers'} · {usdCompact(pool)} pool
        </span>
      </p>
      {shares.length ? (
        <div className="flex h-3 gap-px overflow-hidden rounded-full bg-zinc-100">
          {top.map((s, i) => (
            <div
              key={i}
              title={`${s.mine ? 'You' : 'A clipper'}: ${(s.share * 100).toFixed(1)}%`}
              className="h-full"
              style={{ width: `${s.share * 100}%`, minWidth: s.mine ? 4 : undefined, backgroundColor: s.mine ? '#a3e635' : `rgba(16,185,129,${Math.max(0.25, 0.9 - i * 0.06)})` }}
            />
          ))}
          {rest > 0 && <div className="h-full" style={{ width: `${rest * 100}%`, backgroundColor: 'rgba(16,185,129,0.18)' }} />}
        </div>
      ) : (
        <div className="h-3 rounded-full bg-zinc-100" />
      )}
      <p className="mt-2 text-xs text-zinc-500">
        {mine ? (
          <>
            Your share: <b className="font-semibold" style={{ color: '#a3e635' }}>{(mine.share * 100).toFixed(1)}%</b> ≈ {usdCompact(Math.floor(pool * mine.share))} if it ended now
          </>
        ) : shares.length ? (
          'Each slice is one clipper’s share of approved views.'
        ) : (
          'No approved clips yet. The first ones split the whole pool.'
        )}
      </p>
    </>
  );
}
