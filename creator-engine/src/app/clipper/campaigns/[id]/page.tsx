import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Users, Wallet } from 'lucide-react';
import { getCreatorCampaign } from '@/lib/data';
import { platformRates, rateParts, usd, usdCents, usdCompact } from '@/lib/format';
import { contentTypeLabel } from '@/lib/campaign-tags';
import { PlatformIcon } from '@/components/platform-icon';
import type { Platform } from '@/lib/types';
import { trackingLink } from '@/lib/attribution';
import { claimMoment, connectInstagram, connectTikTok, joinCampaign } from '@/actions/creator';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/action-button';
import { CopyField } from '@/components/copy-button';
import { EarningsEstimator } from '@/components/estimator';
import { YouTubeVerify } from '@/components/forms/youtube-verify';
import { SubmitVideoForm } from '@/components/forms/submit-video-form';
import { CampaignCover, MomentBoard, NextStep, PlatformChips, ReferenceList, RequirementList, StreamerAvatar } from '@/components/views';

export const dynamic = 'force-dynamic';

export default async function ClipperCampaignPage({ params }: { params: { id: string } }) {
  const d = await getCreatorCampaign(params.id);
  if (!d) notFound();
  const { campaign: c } = d;
  const r = rateParts(c);
  const merchLink = d.enrollment ? trackingLink(d.shopDomain, d.enrollment.ref_param) : null;

  const split = platformRates(c);
  const used = c.budget.deposited > 0 ? Math.min(100, (c.budget.committed / c.budget.deposited) * 100) : 0;

  return (
    <div className="space-y-6">
      <Link href="/clipper/discover" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Discover
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {/* Hero: cover, who, what, and how busy it is. */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
            <CampaignCover campaign={c} brandName={c.brandName} variant="card" showTitle={false} />
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                <StreamerAvatar name={c.brandName} />
                <span className="font-medium text-zinc-900">{c.brandName}</span>
                {c.category && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-ink">{c.category}</span>}
                {(c.content_types ?? []).map((t) => (
                  <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
                    {contentTypeLabel(t)}
                  </span>
                ))}
              </div>
              <h1 className="balance mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
              <PlatformChips platforms={c.platforms} className="mt-3" />
              <dl className="mt-5 grid grid-cols-3 divide-x divide-zinc-100 rounded-xl border border-zinc-100 text-center">
                <Fact icon={<Users className="size-4" />} label="Clippers joined" value={String(c.creators)} />
                <Fact icon={<BadgeCheck className="size-4" />} label="Clips approved" value={String(d.approvedClips ?? 0)} />
                <Fact icon={<Wallet className="size-4" />} label="Budget left" value={usdCompact(c.budget.available)} />
              </dl>
            </div>
          </section>

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
              {c.payout_model === 'cps_performance' && <li>Every merch order placed with your code or link earns you {c.cps_commission_pct}%.</li>}
              {c.payout_model === 'hybrid' && (
                <li>
                  {usd(c.base_payout)} once your clip is approved, plus {r.rate} {r.unit}.
                </li>
              )}
              <li>Each clip earns up to {usd(c.cpm_cap)}{Number(c.min_payout) > 0 && <>, and starts paying once it reaches {usd(Number(c.min_payout))}</>}. You keep all of it: there are no fees for clippers.</li>
              <li>{c.brandName} reviews and approves every clip. Once approved, you’re paid automatically.</li>
            </ul>
          </section>
        </div>

        <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-8 lg:self-start">
          {/* The rate, front and centre. */}
          <section className="relative overflow-hidden rounded-2xl border border-brand-b/40 bg-white p-5 shadow-card">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28" style={{ background: 'radial-gradient(80% 100% at 0% 0%, rgb(var(--brand-a) / 0.22), transparent 70%)' }} />
            <div className="relative">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">You earn</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">{r.rate}</span>
                <span className="text-sm text-zinc-500">{r.unit}</span>
              </p>
              {split.length > 0 && (
                <ul className="mt-3 grid grid-cols-3 gap-2">
                  {split.map((p) => (
                    <li key={p.platform} className="rounded-xl bg-zinc-50 px-2 py-2 text-center">
                      <PlatformIcon platform={p.platform as Platform} className="mx-auto size-4 text-zinc-500" />
                      <p className="mt-1 text-sm font-semibold tabular-nums">{usdCents(p.rate)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <p className="text-[11px] text-zinc-500">Max per clip</p>
                  <p className="font-semibold tabular-nums">{c.payout_model === 'pool' ? '—' : usd(c.cpm_cap)}</p>
                </div>
                <div className="rounded-xl bg-zinc-50 px-3 py-2.5">
                  <p className="text-[11px] text-zinc-500">Min to get paid</p>
                  <p className="font-semibold tabular-nums">{Number(c.min_payout) > 0 ? usd(Number(c.min_payout)) : 'None'}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-zinc-500">
                    {usdCompact(c.budget.committed)} of {usdCompact(c.budget.deposited)} used
                  </span>
                  <span className="font-medium">{Math.round(100 - used)}% left</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(used, 1.5)}%` }} />
                </div>
              </div>
            </div>
          </section>

          <Card>
            <NextStep
              campaign={c}
              brandName={c.brandName}
              enrollment={d.enrollment}
              submission={d.submission}
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
            {merchLink && (
              <div className="mt-5 border-t border-zinc-100 pt-5">
                <CopyField label="Your merch link (earns you a cut)" value={merchLink} />
              </div>
            )}
          </Card>
          <Card>
            <EarningsEstimator terms={c} />
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
