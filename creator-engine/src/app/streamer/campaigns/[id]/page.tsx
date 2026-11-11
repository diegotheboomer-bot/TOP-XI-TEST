import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, CheckCheck, Lock, Pencil, Rocket, Send, Users } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { TIER_PERKS } from '@/lib/tiers';
import { getCampaignDetail, getCampaignInvites, type SubmissionRow } from '@/lib/data';
import { compact, rateParts, usd, usdCompact } from '@/lib/format';
import { isDemo } from '@/lib/env';
import { achEnabled, feeFor } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { approveAllPending, cancelCampaign, createDepositIntent, payDemoDeposit, releasePayout, reviewSubmission, setCampaignStatus, simulateSync } from '@/actions/brand';
import { Card, CardHeader } from '@/components/ui/card';
import { StatGrid } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { ActionButton } from '@/components/action-button';
import { CampaignBadge } from '@/components/status';
import { BudgetMeter, CampaignCover, DemoBar, MomentBoard, PlatformChips, ReferenceList, RequirementList, StreamerAvatar, SubmissionTable, submissionActionKinds } from '@/components/views';
import { MomentForm } from '@/components/forms/moment-form';
import { AppAddBudget } from '@/components/checkout/app-checkout';
import { CancelCampaign, type CancelSummary } from '@/components/cancel-campaign';
import type { Campaign } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CampaignPage({ params, searchParams }: { params: { id: string }; searchParams: { funded?: string; fund?: string; saved?: string } }) {
  const detail = await getCampaignDetail(params.id);
  if (!detail) notFound();
  const { campaign: c, submissions, deposited, refunded, paidOut, fees, budget } = detail;
  const r = rateParts(c);
  const ended = c.status === 'completed';
  const { data: brandRow } = isDemo ? { data: null } : await createAdminClient().from('brands').select('early_partner').eq('id', c.brand_id).single();
  const plan = feeFor(!!brandRow?.early_partner);
  const sent = await getCampaignInvites(c.id);
  const invites = sent.length;
  const feePercent = plan.percent;
  const cancel: CancelSummary = {
    refund: budget.available,
    reserved: Math.max(0, c.escrow_balance - budget.available),
    fees,
    feePercent,
    pending: submissions.filter((s) => s.status === 'pending_review').length,
  };
  const publishableKey = isDemo ? null : (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '');

  const views = submissions.reduce((a, s) => a + s.current_view_count, 0);
  const pending = submissions.filter((s) => s.status === 'pending_review').length;
  const fund = Number(searchParams.fund);
  const top = topClippers(submissions).slice(0, 5);

  return (
    <div className="space-y-6">
      <Link href="/streamer" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
        <ArrowLeft className="size-4" /> Campaigns
      </Link>

      {/* Header: cover, title, terms and the one action that matters next. */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <CampaignCover campaign={c} brandName="" variant="card" showTitle={false} className="w-full shrink-0 rounded-2xl shadow-card sm:w-60" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CampaignBadge status={c.status} />
            {c.category && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-ink">{c.category}</span>}
            {c.invite_only && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] font-medium" style={{ color: '#fff' }}>
                <Lock className="size-3" /> Invite only
              </span>
            )}
          </div>
          <h1 className="balance mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="font-medium text-zinc-900">
              {r.rate} {r.unit}
            </span>{' '}
            · {r.terms}
          </p>
          <PlatformChips platforms={c.platforms} className="mt-3" />
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 sm:w-44 sm:grid-cols-1 [&>*]:w-full [&_button]:h-9 [&_button]:w-full">
          {c.invite_only && !ended && c.status !== 'draft' && (
            <Link href={`/streamer/scout?campaign=${c.id}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium transition hover:bg-zinc-50">
              <Send className="size-3.5" /> Invite
            </Link>
          )}
          {!ended && (
            <Link href={`/streamer/campaigns/${c.id}/edit`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium transition hover:bg-zinc-50">
              <Pencil className="size-3.5" /> Edit
            </Link>
          )}
          <StatusActions campaign={c} />
          {c.status !== 'draft' || c.escrow_balance > 0 ? <CancelCampaign summary={cancel} ended={ended} onConfirm={cancelCampaign.bind(null, c.id)} /> : null}
        </div>
      </section>

      {isDemo && !ended && (
        <DemoBar>
          <ActionButton action={simulateSync.bind(null, c.id)}>Run 4h sync</ActionButton>
        </DemoBar>
      )}

      {searchParams.saved && <p className="rounded-xl bg-brand-a/10 px-4 py-3 text-sm ring-1 ring-inset ring-brand-a/30">Changes saved. Clippers see them now.</p>}
      {searchParams.funded && <p className="rounded-xl bg-brand-a/10 px-4 py-3 text-sm ring-1 ring-inset ring-brand-a/30">Payment received. Your budget updates as soon as Stripe confirms it.</p>}
      {c.status === 'draft' && (
        <LaunchChecklist
          campaign={c}
          funded={c.escrow_balance > 0}
          invites={invites}
          addBudget={
            publishableKey === '' ? null : (
              <AppAddBudget
                bankTransfer={achEnabled()}
                campaign={{ id: c.id, title: c.title, payout_model: c.payout_model, cpm_rate: c.cpm_rate, status: c.status }}
                feePercent={feePercent}
                feeFixed={plan.fixed}
                early={plan.early}
                publishableKey={publishableKey}
                createIntent={createDepositIntent}
                payDemo={payDemoDeposit}
              />
            )
          }
        />
      )}

      <StatGrid
        items={[
          { label: 'Budget left', value: usd(c.escrow_balance), hint: `${usdCompact(budget.available)} free to earn` },
          { label: 'Views', value: compact(views), hint: 'Verified by the platforms' },
          { label: 'Clips', value: String(submissions.length), hint: pending ? `${pending} waiting for you` : 'All reviewed' },
          { label: 'Paid to clippers', value: usd(paidOut), hint: 'Sent automatically' },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          <Card>
            <CardHeader
              title={pending ? `Clips · ${pending} to review` : 'Clips'}
              description="You approve every clip. Approved clips are paid automatically after a short hold (3 days, less for top-tier clippers); you can flag one until then."
            />
            {submissions.length === 0 ? (
              <Empty icon={<Users />} title="No clips yet" body="Clips show up here as soon as clippers post them." />
            ) : (
              <>
                {pending > 1 && !ended && (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-4 py-3">
                    <p className="text-sm text-zinc-600">
                      <b className="text-zinc-900">{pending}</b> clips waiting. Approve them all at once; any held for a check stay for you to look at.
                    </p>
                    <ActionButton variant="primary" action={approveAllPending.bind(null, c.id)}>
                      <CheckCheck className="size-4" /> Approve all {pending}
                    </ActionButton>
                  </div>
                )}
                <SubmissionTable rows={submissions} cap={c.cpm_cap} actions={(s) => <SubmissionActions s={s} ended={ended} />} />
              </>
            )}
          </Card>
          <Card>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold tracking-tight">Brief</h2>
              {!ended && (
                <Link href={`/streamer/campaigns/${c.id}/edit`} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
                  Edit
                </Link>
              )}
            </div>
            {c.brief && <p className="mb-4 whitespace-pre-line leading-relaxed text-zinc-600">{c.brief}</p>}
            <RequirementList items={c.requirements} />
            {(c.asset_folder_url || (c.reference_items?.length ?? 0) > 0) && (
              <div className="mt-5 border-t border-zinc-100 pt-5">
                <p className="mb-2 text-[13px] font-medium text-zinc-700">References</p>
                <ReferenceList campaign={c} />
              </div>
            )}
          </Card>
          {c.moments_enabled && (
          <Card>
              <CardHeader title="Moments to clip" description="Pin timestamps from your stream so clippers know what to cut." />
              <MomentBoard moments={detail.moments} showClaimers empty="No moments pinned yet." />
              {!ended && (
                <div className="mt-5 border-t border-zinc-100 pt-5">
                  <MomentForm campaignId={c.id} />
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <Card>
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold tracking-tight">Budget</h2>
              <span className="text-xs text-zinc-500">{usdCompact(deposited + refunded)} added</span>
            </div>
            <BudgetMeter budget={budget} className="mt-3" />
            <div className="mt-5">
              {ended ? (
                <p className="text-sm text-zinc-500">
                  {refunded > 0 ? `${usd(refunded)} refunded to your card. ` : ''}What’s left pays clippers for clips they’ve already earned on.
                </p>
              ) : publishableKey === '' ? (
                <p className="text-sm text-rose-600">Stripe isn’t set up: add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.</p>
              ) : (
                <>
                  <AppAddBudget
                    bankTransfer={achEnabled()}
                    campaign={{ id: c.id, title: c.title, payout_model: c.payout_model, cpm_rate: c.cpm_rate, status: c.status }}
                    feePercent={feePercent}
                    feeFixed={plan.fixed}
                    early={plan.early}
                    publishableKey={publishableKey}
                    createIntent={createDepositIntent}
                    payDemo={payDemoDeposit}
                    initialAmount={fund >= 50 && !searchParams.funded ? fund : undefined}
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    {plan.early ? 'No service fee, only Stripe’s card processing. Unspent budget is refunded if you cancel.' : `${feePercent}% service fee on top. Unspent budget is refunded if you cancel; the fee isn’t.`}
                  </p>
                </>
              )}
            </div>
          </Card>

          {c.payout_model === 'pool' && <PoolSplit rows={submissions} pool={c.escrow_balance + paidOut} ended={ended} />}

          {top.length > 0 && (
            <Card>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-semibold tracking-tight">Top clippers</h2>
                <Link href="/streamer/creators" className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
                  See all
                </Link>
              </div>
              <ol className="space-y-3">
                {top.map((t, i) => (
                  <li key={t.name} className="flex items-center gap-3">
                    <span className="w-4 text-center font-mono text-xs text-zinc-400">{i + 1}</span>
                    <StreamerAvatar name={t.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-zinc-500">
                        {compact(t.views)} views · {t.clips} {t.clips === 1 ? 'clip' : 'clips'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{usdCompact(t.earned)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {(sent.length > 0 || (c.invite_only && !ended)) && (
            <Card>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="flex items-center gap-1.5 font-semibold tracking-tight">
                  <Send className="size-4 text-[rgb(var(--brand-ta))]" /> Invites
                </h2>
                {!ended && (
                  <Link href={`/streamer/scout?campaign=${c.id}`} className="text-xs font-medium text-zinc-500 hover:text-zinc-900">
                    Invite more
                  </Link>
                )}
              </div>
              {sent.length === 0 ? (
                <p className="text-sm text-zinc-500">No one invited yet. Find clippers in Scout.</p>
              ) : (
                <ul className="space-y-3">
                  {sent.map((s) => {
                    const [label, tone] = s.joined
                      ? ['Joined', 'bg-brand text-brand-ink']
                      : s.status === 'declined'
                        ? ['Declined', 'bg-zinc-100 text-zinc-500']
                        : c.status === 'draft'
                          ? ['Sees it at launch', 'bg-amber-100 text-amber-800']
                          : ['Pending', 'bg-zinc-100 text-zinc-700'];
                    return (
                      <li key={s.creatorId} className="flex items-center gap-3">
                        <StreamerAvatar name={s.name} size="md" src={s.avatar} />
                        <Link href={`/streamer/clippers/${s.creatorId}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                          {s.name}
                        </Link>
                        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', tone)}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** Clippers on this campaign ranked by views, with what they've earned. */
function topClippers(rows: SubmissionRow[]) {
  const by = new Map<string, { name: string; views: number; earned: number; clips: number }>();
  for (const s of rows) {
    if (s.status === 'flagged') continue;
    const t = by.get(s.creator_name) ?? { name: s.creator_name, views: 0, earned: 0, clips: 0 };
    t.views += s.current_view_count;
    t.earned += s.payout_earned;
    t.clips++;
    by.set(s.creator_name, t);
  }
  return [...by.values()].sort((a, b) => b.views - a.views);
}

/**
 * Pool campaigns: the whole budget is shared by approved views. Each clipper's
 * share = their approved views ÷ all approved views, times the pool.
 */
function PoolSplit({ rows, pool, ended }: { rows: SubmissionRow[]; pool: number; ended: boolean }) {
  const by = new Map<string, { name: string; views: number; clips: number }>();
  for (const s of rows) {
    if (s.status !== 'live_tracking' && s.status !== 'paid') continue;
    const t = by.get(s.creator_name) ?? { name: s.creator_name, views: 0, clips: 0 };
    t.views += s.current_view_count;
    t.clips++;
    by.set(s.creator_name, t);
  }
  const list = [...by.values()].sort((a, b) => b.views - a.views);
  const total = list.reduce((n, t) => n + t.views, 0);
  const waiting = rows.filter((s) => s.status === 'pending_review').length;
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold tracking-tight">Pool split</h2>
        <span className="text-xs text-zinc-500">{usd(pool)} pool</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        Each clipper gets their share of all approved views. {compact(total)} views so far{ended ? '' : '; shares move as views come in and are paid when the campaign ends'}.
      </p>
      {list.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No approved clips yet.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {list.slice(0, 10).map((t) => {
            const pct = total > 0 ? t.views / total : 0;
            return (
              <li key={t.name}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{t.name}</span>
                  <span className="shrink-0 tabular-nums">
                    <span className="font-semibold">{(pct * 100).toFixed(1)}%</span> <span className="text-zinc-500">· {usd(Math.floor(pool * pct * 100) / 100)}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: '#38bdf8' }} />
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {compact(t.views)} views · {t.clips} {t.clips === 1 ? 'clip' : 'clips'}
                </p>
              </li>
            );
          })}
          {list.length > 10 && <li className="text-xs text-zinc-500">+{list.length - 10} more clippers share {(list.slice(10).reduce((n, t) => n + t.views, 0) / total * 100).toFixed(1)}%</li>}
        </ol>
      )}
      {waiting > 0 && <p className="mt-3 text-xs text-amber-700">{waiting} clips waiting for your review aren’t counted until you approve them.</p>}
    </Card>
  );
}

/** Shown while a campaign is a draft: what's done, what's left, and the launch button. */
function LaunchChecklist({ campaign, funded, invites, addBudget }: { campaign: Campaign; funded: boolean; invites: number; addBudget: React.ReactNode }) {
  const priv = !!campaign.invite_only;
  const invited = invites > 0;
  const inviteLink = (
    <Link href={`/streamer/scout?campaign=${campaign.id}`} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink transition hover:brightness-110">
      <Send className="size-4" /> Invite clippers
    </Link>
  );
  const steps: [string, React.ReactNode, boolean][] = [
    ['Set up the campaign', 'Title, thumbnail, pay and rules', true],
    ['Add a budget', funded ? `${usd(campaign.escrow_balance)} ready for clippers` : 'Use “Add budget” below. Clippers can only join funded campaigns', funded],
    ...(priv
      ? ([
          [
            'Invite clippers',
            invited ? (
              <>
                {invites} invited ·{' '}
                <Link href={`/streamer/scout?campaign=${campaign.id}`} className="font-medium underline">
                  invite more
                </Link>
              </>
            ) : (
              <>
                Invite only, so pick who can join.{' '}
                <Link href={`/streamer/scout?campaign=${campaign.id}`} className="font-medium underline">
                  Find clippers in Scout
                </Link>
              </>
            ),
            invited,
          ],
        ] as [string, React.ReactNode, boolean][])
      : []),
    ['Launch', priv ? 'Invited clippers can join and start posting' : 'Clippers see it in Discover and can start posting', false],
  ];
  const ready = funded && (!priv || invited);
  return (
    <section className="relative overflow-hidden rounded-2xl border border-amber-300/60 bg-white p-5 shadow-card sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20" style={{ background: 'radial-gradient(70% 100% at 10% 0%, rgb(245 158 11 / 0.14), transparent 70%)' }} />
      <div className="relative">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <span className="size-2 animate-pulse rounded-full" style={{ backgroundColor: "#f59e0b" }} /> Not live yet
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Finish setting up your campaign</h2>
          <ol className="mt-4 space-y-3">
            {steps.map(([title, body, done], i) => (
              <li key={title} className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                    done ? 'bg-brand text-brand-ink' : 'border border-zinc-300 text-zinc-500',
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3.5} /> : i + 1}
                </span>
                <div>
                  <p className={cn('text-sm font-medium', done && 'text-zinc-500 line-through decoration-zinc-300')}>{title}</p>
                  <p className="text-xs text-zinc-500">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-5 flex flex-col gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between [&_button]:w-full sm:[&_button]:w-auto">
          <p className="text-sm text-zinc-500">{ready ? 'All set. Launch when you’re ready.' : !funded ? 'Next: add a budget, then launch.' : 'Next: invite at least one clipper, then launch.'}</p>
          {ready ? (
            <ActionButton variant="primary" action={setCampaignStatus.bind(null, campaign.id, 'active')}>
              <Rocket className="size-4" /> Launch campaign
            </ActionButton>
          ) : !funded ? (
            addBudget
          ) : (
            inviteLink
          )}
        </div>
      </div>
    </section>
  );
}

function StatusActions({ campaign }: { campaign: Campaign }) {
  if (campaign.status === 'completed' || campaign.status === 'draft') return null;
  return (
    <>
      {campaign.status === 'paused' && (
        <ActionButton variant="primary" action={setCampaignStatus.bind(null, campaign.id, 'active')}>
          Resume
        </ActionButton>
      )}
      {campaign.status === 'active' && <ActionButton action={setCampaignStatus.bind(null, campaign.id, 'paused')}>Pause</ActionButton>}
    </>
  );
}

function SubmissionActions({ s, ended }: { s: SubmissionRow; ended: boolean }) {
  const kinds = submissionActionKinds(s, ended, Date.now(), s.creator_tier ? TIER_PERKS[s.creator_tier].holdHours : undefined);
  if (!kinds.length) return null;
  return (
    <>
      {kinds.map((k) =>
        k === 'approve' ? (
          <ActionButton key={k} variant="primary" action={reviewSubmission.bind(null, s.id, 'approve')}>Approve</ActionButton>
        ) : k === 'pay' ? (
          <ActionButton key={k} variant="primary" action={releasePayout.bind(null, s.id)}>Pay {usd(s.payout_earned - s.payout_transferred)}</ActionButton>
        ) : k === 'flag' ? (
          <ActionButton key={k} variant="danger" action={reviewSubmission.bind(null, s.id, 'flag')}>Flag</ActionButton>
        ) : (
          <ActionButton key={k} action={reviewSubmission.bind(null, s.id, 'approve')}>Clear flag</ActionButton>
        ),
      )}
    </>
  );
}
