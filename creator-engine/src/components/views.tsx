// Presentational building blocks shared by the Next.js pages and the standalone demo.
// No Next.js imports: callers pass their link component, links and action buttons in.
import { ArrowUpRight, Check, Clock, FileText, Film, Link2, Store } from 'lucide-react';
import type { CampaignSummary, MarketCampaign, MomentRow, SubmissionRow } from '@/lib/data';
import type { BudgetStats } from '@/lib/budget';
import type { Campaign, Enrollment, Platform, Submission } from '@/lib/types';
import { compact, hoursLabel, percent, rateParts, timeAgo, usd, usdCompact } from '@/lib/format';
import { trackingLink } from '@/lib/attribution';
import { contentTypeLabel } from '@/lib/campaign-tags';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { holdHoursLeft, streamerCanFlag } from '@/lib/payout-rules';
import { cn } from './ui/cn';
import { PlatformIcon } from './platform-icon';
import { CopyField } from './copy-button';
import { CampaignBadge, FraudBadge, SubmissionBadge } from './status';

// `a`, or a router link component such as next/link.
export type LinkLike = React.ElementType;

// ─── Campaign cover ────────────────────────────────────────────────────────
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const PLATFORM_LABEL: Record<Platform, string> = { tiktok: 'TikTok', youtube: 'Shorts', instagram: 'Reels' };
const PLATFORM_ORDER: Platform[] = ['tiktok', 'youtube', 'instagram'];

export function PlatformChips({ platforms, className }: { platforms: Platform[]; className?: string }) {
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {PLATFORM_ORDER.filter((p) => platforms.includes(p)).map((p) => (
        <span key={p} className="inline-flex items-center gap-1 rounded border border-zinc-200 px-1.5 py-px text-[11px] font-medium text-zinc-600">
          <PlatformIcon platform={p} className="size-3 text-zinc-400" />
          {PLATFORM_LABEL[p]}
        </span>
      ))}
    </span>
  );
}

const AVATAR_COLORS = ['#0e2a47', '#16403a', '#4c1d4a', '#7f1d1d', '#3d3320', '#1e3a8a'];

/** Initials avatar for a streamer (no photos of real people). */
export function StreamerAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.replace(/[^\p{L}\p{N}\s._-]/gu, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full font-semibold', size === 'sm' ? 'size-6 text-[10px]' : 'size-9 text-xs')}
      style={{ backgroundColor: AVATAR_COLORS[hash(name) % AVATAR_COLORS.length], color: '#fff' }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/** Quiet line-work so generated covers read as artwork rather than flat colour. */
function CoverPattern({ seed }: { seed: string }) {
  const kind = hash(seed) % 3;
  const stroke = 'rgba(255,255,255,0.14)';
  return (
    <svg className="absolute inset-0 size-full" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {kind === 0 &&
        [40, 70, 100, 130, 160, 190].map((r) => <circle key={r} cx="300" cy="170" r={r} fill="none" stroke={stroke} strokeWidth="1.5" />)}
      {kind === 1 &&
        Array.from({ length: 9 }, (_, i) => <line key={i} x1={120 + i * 28} y1="-10" x2={40 + i * 28} y2="190" stroke={stroke} strokeWidth="10" />)}
      {kind === 2 &&
        Array.from({ length: 6 }, (_, r) =>
          Array.from({ length: 8 }, (_, c) => <circle key={`${r}-${c}`} cx={176 + c * 20} cy={24 + r * 26} r="2.2" fill="rgba(255,255,255,0.22)" />),
        )}
    </svg>
  );
}

const ASPECT = { card: 'aspect-[16/9]', banner: 'aspect-[16/9] sm:aspect-[3/1]', thumb: 'aspect-square' } as const;

/** An older campaign's uploaded thumbnail, or the designed Atlas cover (dark, volt glow). */
export function CampaignCover({
  campaign,
  brandName,
  variant = 'card',
  showTitle = true,
  className,
}: {
  campaign: Pick<Campaign, 'title' | 'cover_color' | 'thumbnail_url'>;
  brandName: string;
  variant?: keyof typeof ASPECT;
  /** Off where the title is already printed next to the cover. */
  showTitle?: boolean;
  className?: string;
}) {
  const base = cn('relative overflow-hidden', ASPECT[variant], className);
  if (campaign.thumbnail_url) {
    return (
      <div className={cn(base, 'bg-zinc-100')}>
        <img src={campaign.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
    );
  }
  // One designed cover for every campaign: near-black with a volt glow, white type in both themes.
  const h = hash(campaign.title);
  return (
    <div
      className={base}
      style={{
        color: '#fff',
        backgroundColor: '#0c0f0b',
        backgroundImage: `radial-gradient(120% 90% at ${70 + (h % 30)}% ${100 + (h % 20)}%, rgb(var(--brand-b) / 0.55), transparent 60%), radial-gradient(80% 70% at ${h % 25}% -10%, rgb(var(--brand-a) / 0.35), transparent 65%)`,
      }}
    >
      <CoverPattern seed={campaign.title} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.32), rgba(0,0,0,0) 65%)' }} />
      {variant === 'thumb' ? (
        <span className="absolute inset-0 grid place-items-center text-sm font-semibold tracking-tight">
          {campaign.title.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
        </span>
      ) : (
        <div className={cn('absolute inset-0 flex flex-col justify-between', variant === 'banner' ? 'p-5 sm:p-7' : 'p-4')}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {brandName}
          </span>
          {variant === 'card' && showTitle && <span className="balance max-w-[18ch] text-xl font-semibold leading-[1.05] tracking-tight">{campaign.title}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Budget ────────────────────────────────────────────────────────────────
export function budgetDaysLabel(b: BudgetStats): { text: string; urgent: boolean } {
  if (b.deposited <= 0) return { text: 'Not funded yet', urgent: false };
  if (b.available <= 0) return { text: 'Budget used up', urgent: true };
  if (b.daysLeft === null) return { text: 'Full budget left', urgent: false };
  if (b.daysLeft <= 3) return { text: b.daysLeft <= 1 ? 'Ends within a day' : `About ${b.daysLeft} days left`, urgent: true };
  return { text: b.daysLeft > 60 ? '60+ days left' : `About ${b.daysLeft} days left`, urgent: false };
}

/** How much of the budget is committed, and how long the rest lasts at the current pace. */
export function BudgetMeter({ budget, className }: { budget: BudgetStats; className?: string }) {
  const days = budgetDaysLabel(budget);
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs">
        <span className="text-zinc-500">
          {usdCompact(budget.committed)} of {usdCompact(budget.deposited)} used
        </span>
        <span className={cn('font-medium', days.urgent ? 'text-amber-700' : 'text-zinc-700')}>{days.text}</span>
      </div>
      <Progress value={budget.committed} max={budget.deposited} tone={budget.usedShare > 0.85 ? 'amber' : 'brand'} />
    </div>
  );
}

// ─── References ───────────────────────────────────────────────────────────
/** VODs plus the links and files a streamer attached, as tiles that open in a new tab. */
export function ReferenceList({ campaign }: { campaign: Pick<Campaign, 'asset_folder_url' | 'reference_items'> }) {
  const items = [
    ...(campaign.asset_folder_url ? [{ kind: 'link' as const, url: campaign.asset_folder_url, name: 'VODs and source footage' }] : []),
    ...(campaign.reference_items ?? []),
  ];
  if (!items.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((r) => (
        <li key={r.url}>
          <a href={r.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl border border-zinc-200 bg-white transition hover:border-zinc-300">
            <div className="grid aspect-video place-items-center bg-zinc-100">
              {r.kind === 'image' ? (
                <img src={r.url} alt="" className="size-full object-cover" />
              ) : r.kind === 'video' ? (
                <video src={r.url} muted playsInline preload="metadata" className="size-full object-cover" />
              ) : r.kind === 'link' ? (
                <Link2 className="size-6 text-zinc-400" />
              ) : (
                <FileText className="size-6 text-zinc-400" />
              )}
            </div>
            <p className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium">
              {r.kind === 'video' && <Film className="size-3.5 shrink-0 text-zinc-400" />}
              <span className="truncate">{r.name}</span>
              <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-zinc-400 transition group-hover:text-zinc-700" />
            </p>
          </a>
        </li>
      ))}
    </ul>
  );
}

// ─── Creator marketplace ───────────────────────────────────────────────────
export function MarketCard({ c, href, link: Link = 'a' }: { c: MarketCampaign; href: string; link?: LinkLike }) {
  const r = rateParts(c);
  return (
    <Link
      href={href}
      aria-label={`${c.title} by ${c.brandName}, ${r.rate} ${r.unit}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-card transition group-hover:border-zinc-300">
        {/* Streamer and title are printed below, so the cover is artwork only. */}
        <CampaignCover campaign={c} brandName="" showTitle={false} />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="min-w-0">
            <h3 className="truncate font-semibold tracking-tight">{c.title}</h3>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-zinc-600">
              <StreamerAvatar name={c.brandName} />
              <span className="truncate">{c.brandName}</span>
            </p>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tracking-tight tabular-nums">{r.rate}</span>
            <span className="text-sm text-zinc-500">{r.unit}</span>
          </div>
          <p className="-mt-2 text-xs text-zinc-500">{r.terms}</p>
          {(c.category || (c.content_types?.length ?? 0) > 0) && (
            <div className="-mt-1 flex flex-wrap gap-1.5">
              {c.category && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-ink">{c.category}</span>}
              {(c.content_types ?? []).map((t) => (
                <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{contentTypeLabel(t)}</span>
              ))}
            </div>
          )}
          <BudgetMeter budget={c.budget} className="mt-auto" />
          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500">
            <PlatformChips platforms={c.platforms} />
            <span className="shrink-0">
              {c.creators} {c.creators === 1 ? 'clipper' : 'clippers'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function RequirementList({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-zinc-500">No extra requirements.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((r) => (
        <li key={r} className="flex gap-2.5 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-accent-600" />
          <span className="min-w-0">{r}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Streamer: campaign list ──────────────────────────────────────────────────
export function CampaignRow({ c, href, link: Link = 'a' }: { c: CampaignSummary; href: string; link?: LinkLike }) {
  const r = rateParts(c);
  return (
    <Link href={href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500">
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-4 px-4 py-4 transition group-hover:bg-zinc-50 sm:px-5 lg:grid-cols-[5.5rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_1.25rem]">
        <CampaignCover campaign={c} brandName="" variant="thumb" className="rounded-lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold tracking-tight">{c.title}</h3>
            <CampaignBadge status={c.status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {r.rate} {r.unit} · {r.terms}
          </p>
          {c.status === 'draft' && <p className="mt-1 text-xs font-medium text-amber-700">Finish setup: {c.escrow_balance > 0 ? 'launch it' : 'add a budget, then launch'} →</p>}
          {c.pendingReview > 0 && <p className="mt-1 text-xs font-medium text-amber-700">{c.pendingReview} waiting for review</p>}
        </div>
        <Metric label="Clips" value={String(c.submissions)} className="hidden lg:block" />
        <Metric label="Views" value={compact(c.views)} className="hidden lg:block" />
        <BudgetMeter budget={c.budget} className="col-span-2 lg:col-span-1" />
        <ArrowUpRight className="hidden size-4 text-zinc-400 transition group-hover:text-zinc-900 lg:block" />
      </div>
    </Link>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-0.5 truncate text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

// ─── Streamer: submissions ────────────────────────────────────────────────────
/** One-line state for a submission: review deadline, flag or sync time. */
export function submissionNote(s: Submission, now = Date.now()): { text: string; tone: 'muted' | 'warn' | 'bad' } {
  if (s.status === 'flagged') return { text: s.flag_reason ?? 'Flagged', tone: 'bad' };
  if (s.status === 'paid') return { text: 'Paid in full', tone: 'muted' };
  if (s.status === 'pending_review') {
    return { text: 'Waiting for the streamer to review', tone: 'warn' };
  }
  const hold = holdHoursLeft(s.approved_at, now);
  if (hold > 0) return { text: `Pays automatically in ${hoursLabel(hold * 3_600_000)}`, tone: 'muted' };
  return { text: `Locked. Paid automatically · synced ${timeAgo(s.last_synced_at)}`, tone: 'muted' };
}

const NOTE_TONE = { muted: 'text-zinc-500', warn: 'text-amber-700', bad: 'text-rose-600' } as const;
/** Clips on a fixed grid so numbers and buttons line up: who, views, earned, actions. */
const CLIP_COLS = 'md:grid md:grid-cols-[minmax(0,1fr)_5.5rem_6.5rem_10.5rem] md:items-center md:gap-4';

export function SubmissionTable({
  rows,
  cap,
  actions,
}: {
  rows: SubmissionRow[];
  cap: number;
  actions: (s: SubmissionRow) => React.ReactNode;
}) {
  return (
    <div className="-mx-5 border-t border-zinc-100 sm:-mx-6">
      <div className={cn('hidden px-5 py-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400 sm:px-6', CLIP_COLS)}>
        <span>Clip</span>
        <span className="text-right">Views</span>
        <span className="text-right">Earned</span>
        <span />
      </div>
      <ul className="divide-y divide-zinc-100 md:border-t md:border-zinc-100">
        {rows.map((s) => {
          const note = submissionNote(s);
          const ratio = s.current_view_count > 0 ? s.current_comment_count / s.current_view_count : 0;
          const act = actions(s);
          return (
            <li key={s.id} className={cn('px-5 py-4 sm:px-6', CLIP_COLS)}>
              <div className="flex min-w-0 items-center gap-3">
                <StreamerAvatar name={s.creator_name} size="md" />
                <div className="min-w-0">
                  <a href={s.video_url} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:underline">
                    {s.creator_name}
                  </a>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
                    <SubmissionBadge status={s.status} />
                    <PlatformIcon platform={s.platform} className="size-3 shrink-0" />
                    <span className={cn('truncate md:hidden xl:inline', NOTE_TONE[note.tone])} title={note.text}>
                      {note.text}
                    </span>
                  </p>
                </div>
              </div>
              {/* Phone: numbers on one line under the name. */}
              <div className="mt-3 flex items-center justify-between gap-3 text-sm md:contents">
                <div className="md:text-right">
                  <p className="font-semibold tabular-nums">{compact(s.current_view_count)}</p>
                  <p className="whitespace-nowrap text-[11px] text-zinc-500">{percent(ratio)} engaged</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular-nums">{usd(s.payout_earned)}</p>
                  <Progress value={s.payout_earned} max={cap} className="ml-auto mt-1 w-20" />
                </div>
              </div>
              <div className={cn('mt-3 grid grid-cols-2 gap-2 md:mt-0 md:flex md:justify-end [&>*:only-child]:col-span-2 [&_button]:w-full md:[&_button]:w-auto', !act && 'hidden md:flex')}>{act}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500 lg:sr-only">{label}</dt>
      <dd className="mt-0.5 truncate text-sm tabular-nums lg:mt-0">{value}</dd>
    </div>
  );
}

/** Which review / payout buttons a submission gets, given its state. */
/**
 * Actions on a clip. Once a campaign has ended, clips can still be paid but not approved.
 * A streamer can flag a clip only under review or during the payout hold after approval;
 * after that it is locked and paid automatically.
 */
export function submissionActionKinds(s: Submission, ended = false, now = Date.now()): ('approve' | 'flag' | 'pay' | 'clear')[] {
  const flag = streamerCanFlag(s, now) ? (['flag'] as const) : [];
  if (s.status === 'pending_review') return ended ? [...flag] : ['approve', ...flag];
  if (s.status === 'live_tracking') return s.payout_earned - s.payout_transferred >= 1 ? ['pay', ...flag] : [...flag];
  if (s.status === 'flagged') return ended ? [] : ['clear'];
  return [];
}

export function StorefrontStatus({ shopDomain }: { shopDomain: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3.5 py-3">
      <Store className="size-4 shrink-0 text-zinc-500" />
      <span className="min-w-0 flex-1 break-all text-sm font-medium">{shopDomain}</span>
      <Badge tone="green">Connected</Badge>
    </div>
  );
}

// ─── Creator ───────────────────────────────────────────────────────────────
export interface ChecklistStep {
  label: string;
  detail: string;
  done: boolean;
  action?: React.ReactNode;
}

/** Shown until every step is done. Only the first open step offers its action. */
export function Checklist({ steps, title = 'Get started' }: { steps: ChecklistStep[]; title?: string }) {
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  const next = steps.findIndex((s) => !s.done);
  return (
    <Card flush>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2 className="font-semibold tracking-tight">{title}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {done} of {steps.length} done
          </p>
        </div>
        <Progress value={done} max={steps.length} className="w-32" />
      </div>
      <ol className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold',
                s.done ? 'bg-accent-500 text-white' : i === next ? 'bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-500',
              )}
            >
              {s.done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', s.done && 'text-zinc-500 line-through decoration-zinc-300')}>{s.label}</p>
              {!s.done && <p className="text-xs text-zinc-500">{s.detail}</p>}
            </div>
            {i === next && s.action && <div className="shrink-0">{s.action}</div>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function ConnectionCard({ icon, title, connected, detail, action, status = 'Connected' }: { icon: React.ReactNode; title: string; connected: boolean; detail: string; action: React.ReactNode; status?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative shrink-0">
        <span
          className={cn(
            'relative grid size-9 place-items-center overflow-hidden rounded-lg transition [&>svg]:relative [&>svg]:size-4',
            // Connected: the shiny volt tile; not yet: plain grey.
            connected ? 'platform-tile bg-brand text-brand-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_4px_14px_-4px_rgb(var(--brand-b)/0.5)]' : 'bg-zinc-100 text-zinc-400',
          )}
        >
          {icon}
        </span>
        {connected && (
          <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-brand text-brand-ink ring-2 ring-white">
            <Check className="!size-2.5" strokeWidth={3.5} />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-zinc-500">
          {connected && <span className="text-[rgb(var(--brand-ta))]">{status} · </span>}
          {detail}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

/** A campaign the creator joined: code, link, and either live progress or the submit form. */
export function EnrollmentCard({
  enrollment,
  campaign,
  brandName,
  shopDomain,
  submission,
  submitForm,
  href,
  link: Link = 'a',
}: {
  enrollment: Enrollment;
  campaign: Campaign;
  brandName: string;
  shopDomain: string | null;
  submission: Submission | null;
  submitForm: React.ReactNode;
  href: string;
  link?: LinkLike;
}) {
  const linkUrl = trackingLink(shopDomain, enrollment.ref_param);
  const r = rateParts(campaign);
  return (
    <Card className="flex min-w-0 flex-col gap-5">
      <div className="flex items-start gap-3">
        <CampaignCover campaign={campaign} brandName={brandName} variant="thumb" className="w-14 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-zinc-500">{brandName}</p>
          <Link href={href} className="block truncate font-semibold tracking-tight hover:underline">
            {campaign.title}
          </Link>
          <p className="mt-0.5 text-sm text-zinc-500">
            {r.rate} {r.unit} · {r.terms}
          </p>
        </div>
        {submission && <SubmissionBadge status={submission.status} />}
      </div>

      {linkUrl && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CopyField label="Merch discount code" value={enrollment.discount_code} />
          <CopyField label="Merch link" value={linkUrl} />
        </div>
      )}

      {submission ? (
        <div className="space-y-2 rounded-lg bg-zinc-50 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-zinc-500">
              {compact(submission.current_view_count)} views · {submission.current_conversions} orders
            </span>
            <span className="font-medium tabular-nums">
              {usd(submission.payout_earned)} <span className="text-zinc-400">/ {usd(campaign.cpm_cap)}</span>
            </span>
          </div>
          <Progress value={submission.payout_earned} max={campaign.cpm_cap} />
          {submission.status === 'pending_review' && (
            <p className="flex items-center gap-1.5 pt-1 text-xs text-zinc-500">
              <Clock className="size-3.5" />
              {submissionNote(submission).text}
            </p>
          )}
          {submission.flag_reason && <p className="pt-1 text-xs text-rose-600">{submission.flag_reason}</p>}
        </div>
      ) : (
        submitForm
      )}
    </Card>
  );
}

// ─── Moments ───────────────────────────────────────────────────────────────
/**
 * Moments the streamer pinned from a stream. Each has a limited number of
 * claims so clippers spread out instead of all cutting the same thing.
 */
export function MomentBoard({
  moments,
  showClaimers,
  action,
  empty,
}: {
  moments: MomentRow[];
  showClaimers?: boolean;
  action?: (m: MomentRow) => React.ReactNode;
  empty: string;
}) {
  if (!moments.length) return <p className="text-sm text-zinc-500">{empty}</p>;
  return (
    <ul className="divide-y divide-zinc-100">
      {moments.map((m) => {
        const left = m.max_claims - m.claimed_by.length;
        return (
          <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
            <span className="w-[4.5rem] shrink-0 font-mono text-xs tabular-nums text-zinc-500">{m.timestamp_label}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{m.title}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {left > 0 ? `${left} of ${m.max_claims} ${m.max_claims === 1 ? 'slot' : 'slots'} open` : 'All slots taken'}
                {showClaimers && m.claimers.length > 0 && ` · ${m.claimers.join(', ')}`}
              </p>
            </div>
            {action && <div className="shrink-0">{action(m)}</div>}
          </li>
        );
      })}
    </ul>
  );
}

// ─── Clipper: next step on a campaign ──────────────────────────────────────
export type ClipperStage = 'join' | 'post' | 'review' | 'earning' | 'flagged' | 'paid';

export function clipperStage(enrollment: Enrollment | null, submission: Submission | null): ClipperStage {
  if (!enrollment) return 'join';
  if (!submission) return 'post';
  if (submission.status === 'pending_review') return 'review';
  if (submission.status === 'flagged') return 'flagged';
  if (submission.status === 'paid') return 'paid';
  return 'earning';
}


/**
 * Tells a clipper exactly what to do next on a campaign, with the action right
 * there: join, then post and paste the link, then wait for review, then earn.
 */
export function NextStep({
  campaign,
  brandName,
  enrollment,
  submission,
  claimedMoment,
  join,
  submitForm,
  tiktokPrompt,
}: {
  campaign: Campaign;
  brandName: string;
  enrollment: Enrollment | null;
  submission: Submission | null;
  /** Title of a moment this clipper claimed, if any. */
  claimedMoment: string | null;
  join: React.ReactNode;
  submitForm: React.ReactNode;
  /** Shown in the post step when TikTok is allowed but not connected. */
  tiktokPrompt?: React.ReactNode;
}) {
  const stage = clipperStage(enrollment, submission);
  const where = campaign.platforms.map((p) => ({ tiktok: 'TikTok', youtube: 'YouTube Shorts', instagram: 'Instagram Reels' })[p]).join(', ');

  return (
    <div>
      <div>
        {stage === 'join' && (
          <>
            <h3 className="font-semibold tracking-tight">Join this campaign</h3>
            <p className="mt-1 text-sm text-zinc-600">It’s free. Then clip any moment from {brandName}’s streams and post it on {where}.</p>
            <div className="mt-4">{join}</div>
          </>
        )}

        {stage === 'post' && enrollment && (
          <>
            <h3 className="font-semibold tracking-tight">Post your clip, then paste the link</h3>
            <p className="mt-1 text-sm text-zinc-600">
              Post it on {where} from your connected account{claimedMoment ? <> (your moment: <span className="font-medium text-zinc-900">{claimedMoment}</span>)</> : ''}, then paste the link here.
            </p>
            {tiktokPrompt && <div className="mt-3">{tiktokPrompt}</div>}
            <div className="mt-4">{submitForm}</div>
          </>
        )}

        {stage === 'review' && submission && (
          <>
            <h3 className="font-semibold tracking-tight">Waiting for {brandName} to review</h3>
            <p className="mt-1 text-sm text-zinc-600">{submissionNote(submission).text}. Views are already being counted.</p>
          </>
        )}

        {stage === 'flagged' && submission && (
          <>
            <h3 className="font-semibold tracking-tight">Your clip was flagged</h3>
            <p className="mt-1 text-sm text-rose-600">{submission.flag_reason ?? 'The streamer flagged this clip.'}</p>
            <p className="mt-2 text-sm text-zinc-600">It stops earning until it’s cleared.</p>
          </>
        )}

        {(stage === 'earning' || stage === 'paid') && submission && (
          <>
            <h3 className="font-semibold tracking-tight">{stage === 'paid' ? 'Paid in full' : 'You’re earning'}</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {compact(submission.current_view_count)} views so far. {usd(submission.payout_transferred)} paid out.
            </p>
            <div className="mt-4 flex items-baseline justify-between text-sm">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">{usd(submission.payout_earned)}</span>
              <span className="text-zinc-500">of {usd(campaign.cpm_cap)} max</span>
            </div>
            <Progress value={submission.payout_earned} max={campaign.cpm_cap} className="mt-2" />
          </>
        )}
      </div>
    </div>
  );
}

export function DemoBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-zinc-300 px-4 py-3">
      <p className="text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">Demo tools.</span> Fast-forward time or send a test order.
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
