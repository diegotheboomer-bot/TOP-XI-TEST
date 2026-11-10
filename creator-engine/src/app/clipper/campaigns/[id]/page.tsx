import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCreatorCampaign } from '@/lib/data';
import { rateParts, usd } from '@/lib/format';
import { trackingLink } from '@/lib/attribution';
import { claimMoment, connectTikTok, joinCampaign } from '@/actions/creator';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/action-button';
import { CopyField } from '@/components/copy-button';
import { EarningsEstimator } from '@/components/estimator';
import { YouTubeVerify } from '@/components/forms/youtube-verify';
import { SubmitVideoForm } from '@/components/forms/submit-video-form';
import { BudgetMeter, CampaignCover, MomentBoard, NextStep, PlatformChips, RequirementList, StreamerAvatar } from '@/components/views';

export const dynamic = 'force-dynamic';

export default async function ClipperCampaignPage({ params }: { params: { id: string } }) {
  const d = await getCreatorCampaign(params.id);
  if (!d) notFound();
  const { campaign: c } = d;
  const r = rateParts(c);
  const merchLink = d.enrollment ? trackingLink(d.shopDomain, d.enrollment.ref_param) : null;

  return (
    <div className="space-y-6">
      <Link href="/clipper/discover" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Discover
      </Link>
      <CampaignCover campaign={c} brandName={c.brandName} variant="banner" className="rounded-xl" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* On phones the next-step box comes first so the action is never buried. */}
        <aside className="space-y-4 lg:sticky lg:top-8 lg:order-2 lg:self-start">
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
                (c.platforms.includes('tiktok') && !d.tiktokConnected) || (c.platforms.includes('youtube') && !d.youtubeVerified) ? (
                  <div className="space-y-2">
                    {c.platforms.includes('tiktok') && !d.tiktokConnected && (
                      <form action={connectTikTok} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
                        <span>Posting on TikTok? Connect it first so we know the clips are yours.</span>
                        <Button size="sm" variant="secondary">
                          Connect
                        </Button>
                      </form>
                    )}
                    {c.platforms.includes('youtube') && !d.youtubeVerified && (
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
                        <span>Posting Shorts? Verify your YouTube channel first.</span>
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
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{r.rate}</span>
              <span className="text-sm text-zinc-500">{r.unit}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{r.terms}</p>
            <BudgetMeter budget={c.budget} className="mt-5" />
            <div className="mt-5 border-t border-zinc-100 pt-5">
              <EarningsEstimator terms={c} />
            </div>
          </Card>
        </aside>

        <div className="space-y-8 lg:order-1">
          <div>
            <h1 className="balance text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
              <StreamerAvatar name={c.brandName} /> {c.brandName}
            </p>
            <PlatformChips platforms={c.platforms} className="mt-3" />
          </div>
          {c.brief && (
            <section>
              <h2 className="mb-2 font-semibold tracking-tight">What {c.brandName} wants</h2>
              <p className="max-w-prose leading-relaxed text-zinc-600">{c.brief}</p>
            </section>
          )}
          <section>
            <h2 className="mb-1 font-semibold tracking-tight">Moments to clip</h2>
            <p className="mb-4 text-sm text-zinc-500">Claim one before you cut it. Each moment has a few slots so clips stay varied.</p>
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
          <section>
            <h2 className="mb-3 font-semibold tracking-tight">Rules for your clip</h2>
            <RequirementList items={c.requirements} />
          </section>
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
              <li>Earnings stop at {usd(c.cpm_cap)} per clipper. You keep all of it: there are no fees for clippers.</li>
              <li>If {c.brandName} hasn’t reviewed a clean clip after {c.auto_approve_hours} hours, it’s approved automatically.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
