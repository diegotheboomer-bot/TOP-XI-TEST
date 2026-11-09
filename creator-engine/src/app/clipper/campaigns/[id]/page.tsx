import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getCreatorCampaign } from '@/lib/data';
import { rateParts, usd } from '@/lib/format';
import { platformFeePercent } from '@/lib/stripe';
import { claimMoment, joinCampaign } from '@/actions/creator';
import { Card } from '@/components/ui/card';
import { ActionButton } from '@/components/action-button';
import { EarningsEstimator } from '@/components/estimator';
import { SubmitVideoForm } from '@/components/forms/submit-video-form';
import { BudgetMeter, CampaignCover, EnrollmentCard, MomentBoard, PlatformChips, RequirementList, StreamerAvatar } from '@/components/views';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function CreatorCampaignPage({ params }: { params: { id: string } }) {
  const d = await getCreatorCampaign(params.id);
  if (!d) notFound();
  const { campaign: c } = d;
  const r = rateParts(c);
  const fee = platformFeePercent();

  return (
    <div className="space-y-6">
      <Link href="/clipper/discover" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Discover
      </Link>
      <CampaignCover campaign={c} brandName={c.brandName} variant="banner" className="rounded-xl" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <div>
            <h1 className="balance text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
              <StreamerAvatar name={c.brandName} /> {c.brandName}
            </p>
            <PlatformChips platforms={c.platforms} className="mt-3" />
          </div>
          {c.brief && (
            <section>
              <h2 className="mb-2 font-semibold tracking-tight">The brief</h2>
              <p className="max-w-prose leading-relaxed text-zinc-600">{c.brief}</p>
            </section>
          )}
          <section>
            <h2 className="mb-1 font-semibold tracking-tight">Moments to clip</h2>
            <p className="mb-4 text-sm text-zinc-500">Claim one before you cut it. Each moment has a few slots so clips stay varied.</p>
            <MomentBoard
              moments={d.moments}
              empty="No moments pinned yet. Anything from the VODs is fair game."
              action={(m) =>
                m.mine ? (
                  <Badge tone="green">Yours</Badge>
                ) : m.claimed_by.length >= m.max_claims ? (
                  <Badge>Full</Badge>
                ) : d.enrollment ? (
                  <ActionButton action={claimMoment.bind(null, m.id)}>Claim</ActionButton>
                ) : null
              }
            />
          </section>
          <section>
            <h2 className="mb-3 font-semibold tracking-tight">Requirements</h2>
            <RequirementList items={c.requirements} />
          </section>
          <section>
            <h2 className="mb-2 font-semibold tracking-tight">How you get paid</h2>
            <ul className="max-w-prose list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-600">
              <li>Views are read from TikTok and YouTube every 4 hours. Screenshots and self-reported numbers aren’t accepted.</li>
              <li>Put your clip code in the caption. It proves the clip is yours on any platform.</li>
              {c.payout_model === 'cps_performance' && <li>Every order placed with your code or link earns you {c.cps_commission_pct}%.</li>}
              {c.payout_model === 'hybrid' && <li>{usd(c.base_payout)} base fee once your video is approved, plus {r.rate} {r.unit}.</li>}
              <li>Earnings stop at {usd(c.cpm_cap)} per clipper. A {fee}% platform fee comes out of each payout.</li>
              <li>If {c.brandName} hasn’t reviewed a clean clip with #ad after {c.auto_approve_hours} hours, it’s approved automatically.</li>
            </ul>
          </section>
          {d.enrollment && (
            <EnrollmentCard
              enrollment={d.enrollment}
              campaign={c}
              brandName={c.brandName}
              shopDomain={d.shopDomain}
              submission={d.submission}
              href={`/clipper/campaigns/${c.id}`}
              link={Link}
              submitForm={<SubmitVideoForm campaignId={c.id} />}
            />
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <Card>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{r.rate}</span>
              <span className="text-sm text-zinc-500">{r.unit}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{r.terms}</p>
            <BudgetMeter budget={c.budget} className="mt-5" />
            <div className="mt-5 border-t border-zinc-100 pt-5">
              <EarningsEstimator terms={c} feePercent={fee} />
            </div>
            <div className="mt-5">
              {d.enrollment ? (
                <p className="rounded-lg bg-accent-50 px-3.5 py-2.5 text-sm text-accent-700">You’ve joined. Your clip code is below.</p>
              ) : (
                <ActionButton variant="primary" block action={joinCampaign.bind(null, c.id)}>
                  Join campaign
                </ActionButton>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
