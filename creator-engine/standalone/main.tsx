// Standalone demo: the Creator Engine UI running entirely in the browser, for a
// shareable link. Uses the same components, payout/fee/fraud logic and demo core
// as the Next.js app. State is kept in this browser's localStorage when available.
// Build: npm run build:demo
import { useEffect, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowLeftRight, Compass, House, LayoutList, Megaphone, Music2, Plus, RotateCcw, Users, Wallet } from 'lucide-react';
import * as core from '@/lib/demo-core';
import { compact, payoutModelLabel, rateParts, usd, usdCompact } from '@/lib/format';
import { CampaignSchema, MomentSchema, ShopDomainSchema, campaignInput, thumbnailError } from '@/lib/schemas';
import { MomentFields } from '@/components/forms/moment-fields';
import { AddBudget } from '@/components/checkout/fund-checkout';
import { CancelCampaign } from '@/components/cancel-campaign';
import { MockPayment } from '@/components/checkout/mock-payment';
import { PayoutsView } from '@/components/payouts/payouts-view';
import { MockOnboarding } from '@/components/payouts/mock-onboarding';
import { PayoutHandleSchema, payoutDestination } from '@/lib/payout-methods';
import type { ActionState } from '@/actions/result';
import type { Campaign } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClass } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { StatGrid } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { PageHeader } from '@/components/ui/page-header';
import { FormMessage } from '@/components/form-message';
import { CampaignBadge } from '@/components/status';
import { AppShell, type NavSection } from '@/components/app-shell';
import { Landing } from '@/components/landing';
import { CopyField } from '@/components/copy-button';
import { trackingLink } from '@/lib/attribution';
import { RolePicker } from '@/components/role-picker';
import { ThemeToggle } from '@/components/theme-toggle';
import { EarningsEstimator } from '@/components/estimator';
import { CampaignFormBody } from '@/components/forms/campaign-form-body';
import {
  BudgetMeter,
  CampaignCover,
  CampaignRow,
  Checklist,
  ConnectionCard,
  DemoBar,
  EnrollmentCard,
  MarketCard,
  MomentBoard,
  NextStep,
  PlatformChips,
  RequirementList,
  StreamerAvatar,
  StorefrontStatus,
  SubmissionTable,
  submissionActionKinds,
} from '@/components/views';

const FEE_PERCENT = 9; // charged to streamers on top of their budget; clippers keep 100%
const STORAGE_KEY = 'creator-engine-demo-v3';
const ASSETS = 'thumbs/';

interface Saved {
  state: core.DemoState;
  viewer: string;
}

function fresh(): Saved {
  const state = core.seedDemo(FEE_PERCENT, ASSETS);
  return { state, viewer: core.defaultCreatorId(state) };
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Saved;
      if (saved?.state?.campaigns && core.hasCreator(saved.state, saved.viewer)) return saved;
    }
  } catch {
    // storage blocked or corrupt: start fresh
  }
  return fresh();
}

function save(saved: Saved): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return true;
  } catch {
    return false; // storage unavailable or full: the demo still works for this visit
  }
}

// ─── Routing on plain #names ───────────────────────────────────────────────
type Route =
  | { name: 'home' }
  | { name: 'start' }
  | { name: 'brand' }
  | { name: 'new-campaign' }
  | { name: 'campaign'; id: string }
  | { name: 'creator' }
  | { name: 'discover' }
  | { name: 'payouts' }
  | { name: 'offer'; id: string };

function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (h === 'start' || h === 'brand' || h === 'creator' || h === 'discover' || h === 'new-campaign' || h === 'payouts') return { name: h };
  if (h.startsWith('campaign-')) return { name: 'campaign', id: h.slice('campaign-'.length) };
  if (h.startsWith('offer-')) return { name: 'offer', id: h.slice('offer-'.length) };
  return { name: 'home' };
}

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

const go = (hash: string) => {
  location.hash = hash;
};

// ─── Store hook ────────────────────────────────────────────────────────────
type Store = ReturnType<typeof useStore>;

function useStore() {
  const ref = useRef<Saved>(load());
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [toast, setToast] = useState<ActionState & { key?: number }>();
  const timer = useRef<number>();

  const notify = (result: ActionState) => {
    if (!result?.error && !result?.success) return;
    setToast({ ...result, key: Date.now() });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(undefined), 3500);
  };

  /** Runs a demo action, saves, re-renders and shows its result. */
  const run = (fn: (s: core.DemoState, viewer: string) => ActionState | void, { quiet = false } = {}): ActionState => {
    const result = fn(ref.current.state, ref.current.viewer) ?? undefined;
    save(ref.current);
    rerender();
    if (!quiet) notify(result);
    return result;
  };

  return {
    get state() {
      return ref.current.state;
    },
    get viewer() {
      return ref.current.viewer;
    },
    run,
    notify,
    toast,
    setViewer(id: string) {
      if (!core.hasCreator(ref.current.state, id)) return;
      ref.current.viewer = id;
      save(ref.current);
      rerender();
    },
    reset() {
      ref.current = fresh();
      save(ref.current);
      rerender();
      notify({ success: 'Demo reset to the starting data.' });
    },
  };
}

// ─── App frame ─────────────────────────────────────────────────────────────
type Role = 'streamer' | 'clipper';

const SECTIONS: Record<Role, NavSection> = {
  streamer: {
    title: 'Streamer',
    items: [
      { href: '#brand', label: 'Campaigns', icon: <LayoutList /> },
      { href: '#new-campaign', label: 'New campaign', icon: <Plus /> },
    ],
  },
  clipper: {
    title: 'Clipper',
    items: [
      { href: '#creator', label: 'Home', icon: <House /> },
      { href: '#discover', label: 'Discover', icon: <Compass /> },
      { href: '#payouts', label: 'Payouts', icon: <Wallet /> },
    ],
  },
};

/** Which side of the app a page belongs to; the sidebar only shows that side. */
const ROUTE_ROLE: Record<Exclude<Route['name'], 'home' | 'start'>, Role> = {
  brand: 'streamer',
  campaign: 'streamer',
  'new-campaign': 'streamer',
  creator: 'clipper',
  discover: 'clipper',
  offer: 'clipper',
  payouts: 'clipper',
};

const CURRENT: Record<Exclude<Route['name'], 'home' | 'start'>, string> = {
  brand: '#brand',
  campaign: '#brand',
  'new-campaign': '#new-campaign',
  creator: '#creator',
  discover: '#discover',
  offer: '#discover',
  payouts: '#payouts',
};

const footerItem = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 [&>svg]:size-4';

function App() {
  const store = useStore();
  const route = useRoute();

  if (route.name === 'home' || route.name === 'start') {
    return (
      <>
        <LandingHeader />
        {route.name === 'home' ? (
          <Landing startHref="#start" clipperHref="#discover" assetBase={ASSETS} feePercent={FEE_PERCENT} />
        ) : (
          <RolePicker streamerHref="#brand" clipperHref="#creator" assetBase={ASSETS} />
        )}
        <Toast state={store.toast} />
      </>
    );
  }
  const role = ROUTE_ROLE[route.name];
  const other: Role = role === 'streamer' ? 'clipper' : 'streamer';

  return (
    <>
      <AppShell
        sections={[SECTIONS[role]]}
        current={CURRENT[route.name]}
        homeHref="#home"
        demo
        footer={
          <div className="flex gap-1 lg:block lg:space-y-0.5">
            <ThemeToggle className="w-full" labelClassName="hidden lg:inline" />
            <a href={other === 'streamer' ? '#brand' : '#creator'} className={footerItem}>
              <ArrowLeftRight /> <span className="hidden lg:inline">Switch to {other} view</span>
              <span className="lg:hidden">{other === 'streamer' ? 'Streamer' : 'Clipper'}</span>
            </a>
            <button type="button" onClick={store.reset} className={footerItem}>
              <RotateCcw /> <span className="hidden lg:inline">Reset demo</span>
              <span className="lg:hidden">Reset</span>
            </button>
          </div>
        }
      >
        {route.name === 'brand' && <BrandDashboard store={store} />}
        {route.name === 'new-campaign' && <NewCampaign store={store} />}
        {route.name === 'campaign' && <CampaignPage store={store} id={route.id} />}
        {route.name === 'creator' && <CreatorHome store={store} />}
        {route.name === 'discover' && <Discover store={store} />}
        {route.name === 'offer' && <Offer store={store} id={route.id} />}
        {route.name === 'payouts' && <Payouts store={store} />}
      </AppShell>
      <Toast state={store.toast} />
    </>
  );
}

function LandingHeader() {
  return (
    <header className="site-header sticky z-20 border-b border-zinc-200/70 bg-zinc-50/85 backdrop-blur">
      <div className="gutter mx-auto flex h-16 max-w-6xl items-center justify-between gap-3">
        <a href="#home" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand text-brand-ink">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17 9.5 11l4 4L20 8" />
            </svg>
          </span>
          <span>Creator Engine</span>
        </a>
        <nav className="flex items-center gap-1 text-sm">
          <ThemeToggle labelled={false} />
          <a href="#start" className={buttonClass('primary', 'sm')}>
            Get started
          </a>
        </nav>
      </div>
    </header>
  );
}

function Toast({ state }: { state?: ActionState & { key?: number } }) {
  if (!state?.error && !state?.success) return null;
  return (
    <div className="toast pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
      <p
        key={state.key}
        role="status"
        className={`toast-in pointer-events-auto max-w-md rounded-lg px-4 py-3 text-sm shadow-lg ring-1 ${
          state.error ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-zinc-900 text-white ring-zinc-900'
        }`}
      >
        {state.error ?? state.success}
      </p>
    </div>
  );
}

function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
      <ArrowLeft className="size-4" /> {children}
    </a>
  );
}

// ─── Brand ─────────────────────────────────────────────────────────────────
function BrandDashboard({ store }: { store: Store }) {
  const { brandName, campaigns } = core.brandDashboard(store.state);
  const sum = (f: (c: (typeof campaigns)[number]) => number) => campaigns.reduce((a, c) => a + f(c), 0);
  const pending = sum((c) => c.pendingReview);
  const firstDraft = campaigns.find((c) => c.status === 'draft');
  return (
    <>
      <PageHeader
        eyebrow={<span className="text-sm text-zinc-500">{brandName}</span>}
        title="Campaigns"
        description={pending ? `${pending} ${pending === 1 ? 'clip is' : 'clips are'} waiting for your review.` : 'Every clip is reviewed.'}
        actions={
          <a href="#new-campaign" className={buttonClass('primary')}>
            <Plus className="size-4" /> New campaign
          </a>
        }
      />
      <Checklist
        title="Launch your first campaign"
        steps={[
          {
            label: 'Create a campaign',
            detail: 'Set your rate, cap and which platforms clippers can post on.',
            done: campaigns.length > 0,
            action: (
              <a href="#new-campaign" className={buttonClass('primary', 'sm')}>
                Create
              </a>
            ),
          },
          {
            label: 'Fund it',
            detail: 'Add the budget. Clippers are paid from it as their views come in.',
            done: campaigns.some((c) => c.budget.deposited > 0),
            action: firstDraft ? (
              <a href={`#campaign-${firstDraft.id}`} className={buttonClass('primary', 'sm')}>
                Open
              </a>
            ) : undefined,
          },
          { label: 'Go live and pin moments', detail: 'Pin timestamps from your stream so clippers know what to cut.', done: campaigns.some((c) => c.status === 'active') },
        ]}
      />
      <StatGrid
        className="mt-6"
        items={[
          { label: 'Escrow held', value: usd(sum((c) => c.escrow_balance)) },
          { label: 'Earned by clippers', value: usd(sum((c) => c.budget.committed)) },
          { label: 'Verified views', value: compact(sum((c) => c.views)) },
          { label: 'Merch orders', value: compact(sum((c) => c.conversions)) },
        ]}
      />
      <Card flush className="mt-8 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-5">
            <Empty icon={<Megaphone />} title="No campaigns yet" body="Create a campaign, fund it and go live to start getting clips." />
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {campaigns.map((c) => (
              <CampaignRow key={c.id} c={c} href={`#campaign-${c.id}`} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function CampaignPage({ store, id }: { store: Store; id: string }) {
  const detail = core.campaignDetail(store.state, id);
  if (!detail) {
    return (
      <Empty
        icon={<Megaphone />}
        title="Campaign not found"
        body="It may have been removed by a reset."
        action={
          <a href="#brand" className={buttonClass('secondary')}>
            Back to campaigns
          </a>
        }
      />
    );
  }
  const { campaign: c, submissions, shopDomain, deposited, refunded, paidOut, fees, budget } = detail;
  const r = rateParts(c);
  const act = (fn: (s: core.DemoState) => ActionState) => store.run((s) => fn(s));
  const ended = c.status === 'completed';
  const cancel = {
    refund: budget.available,
    reserved: Math.max(0, c.escrow_balance - budget.available),
    fees,
    feePercent: FEE_PERCENT,
    pending: submissions.filter((s) => s.status === 'pending_review').length,
  };

  return (
    <div className="space-y-6">
      <BackLink href="#brand">Campaigns</BackLink>
      <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
        <CampaignCover campaign={c} brandName="" showTitle={false} className="rounded-xl" />
        <div className="min-w-0">
          <CampaignBadge status={c.status} />
          <h1 className="balance mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {payoutModelLabel[c.payout_model]} · {r.rate} {r.unit} · {r.terms}
          </p>
          <PlatformChips platforms={c.platforms} className="mt-2" />
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusActions campaign={c} act={act} />
            {c.status !== 'draft' || c.escrow_balance > 0 ? (
              <CancelCampaign key={c.id} summary={cancel} ended={ended} onConfirm={() => store.run((s) => core.cancelCampaign(s, c.id), { quiet: true })} />
            ) : null}
          </div>
        </div>
      </div>

      {!ended && (
      <DemoBar>
        <Button size="sm" variant="secondary" onClick={() => act((s) => core.simulateSync(s, c.id))}>
          Run 4h sync
        </Button>
        {shopDomain && (
          <Button size="sm" variant="secondary" onClick={() => act((s) => core.simulateSale(s, c.id))}>
            Simulate merch order
          </Button>
        )}
      </DemoBar>
      )}

      <StatGrid
        items={[
          { label: 'Budget left', value: usd(c.escrow_balance), hint: `${usdCompact(deposited + refunded)} added, ${usdCompact(fees)} fee${refunded > 0 ? `, ${usdCompact(refunded)} refunded` : ''}` },
          { label: 'Paid to clippers', value: usd(paidOut), hint: 'Clippers keep 100%' },
          { label: 'Verified views', value: compact(submissions.reduce((a, s) => a + s.current_view_count, 0)) },
          { label: 'Merch orders', value: compact(submissions.reduce((a, s) => a + s.current_conversions, 0)) },
        ]}
      />

      <div className="grid grid-cols-1 gap-6">
        <div className="order-2 min-w-0 space-y-6">
        <Card>
          <CardHeader title="Clips" description={`Views sync every 4 hours. Clean clips with #ad auto-approve after ${c.auto_approve_hours}h.`} />
          {submissions.length === 0 ? (
            <Empty icon={<Users />} title="No clips yet" body="Clips show up here as soon as clippers post them." />
          ) : (
            <SubmissionTable
              rows={submissions}
              cap={c.cpm_cap}
              autoApproveHours={c.auto_approve_hours}
              actions={(s) => {
                const kinds = submissionActionKinds(s, ended);
                if (!kinds.length) return null;
                return (
                  <>
                    {kinds.includes('approve') && (
                      <Button size="sm" onClick={() => act((st) => core.reviewSubmission(st, s.id, 'approve'))}>
                        Approve
                      </Button>
                    )}
                    {kinds.includes('pay') && (
                      <Button size="sm" onClick={() => act((st) => core.releasePayout(st, s.id))}>
                        Pay {usd(s.payout_earned - s.payout_transferred)}
                      </Button>
                    )}
                    {kinds.includes('flag') && (
                      <Button size="sm" variant="danger" onClick={() => act((st) => core.reviewSubmission(st, s.id, 'flag'))}>
                        Flag
                      </Button>
                    )}
                    {kinds.includes('clear') && (
                      <Button size="sm" variant="secondary" onClick={() => act((st) => core.reviewSubmission(st, s.id, 'approve'))}>
                        Clear flag
                      </Button>
                    )}
                  </>
                );
              }}
            />
          )}
        </Card>
        <Card>
          <CardHeader title="Moments to clip" description="Pin timestamps from your stream. Slots stop everyone cutting the same moment." />
          <MomentBoard moments={detail.moments} showClaimers empty="No moments pinned yet." />
          {!ended && (
          <form
            className="mt-5 border-t border-zinc-100 pt-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const m = MomentSchema.safeParse(Object.fromEntries(new FormData(form)));
              if (!m.success) return fail(store, m.error.issues[0].message);
              const r = act((st) => core.addMoment(st, c.id, m.data));
              if (!r?.error) form.reset();
            }}
          >
            <MomentFields idPrefix={c.id} submit={<Button type="submit" variant="secondary">Pin moment</Button>} />
          </form>
          )}
        </Card>
        </div>

        <div className="order-1 grid grid-cols-1 gap-6 md:grid-cols-3 md:items-start">
          <Card>
            <CardHeader title="Budget" description={ended ? 'Campaign ended' : `${usd(budget.available)} free to earn`} />
            <BudgetMeter budget={budget} />
            <div className="mt-5 border-t border-zinc-100 pt-5">
              {ended ? (
                <p className="text-sm text-zinc-500">
                  {refunded > 0 ? `${usd(refunded)} refunded to your card. ` : ''}What’s left pays clippers for clips they’ve already earned on.
                </p>
              ) : (
                <>
                  <AddBudget
                    key={c.id}
                    campaign={c}
                    feePercent={FEE_PERCENT}
                    className="w-full"
                    note="Demo mode: mock money only."
                    payment={(quote, onPaid) => (
                      <MockPayment quote={quote} onPay={(amount) => store.run((s) => core.fundEscrow(s, c.id, amount), { quiet: true })} onPaid={onPaid} />
                    )}
                  />
                  <p className="mt-2 text-xs text-zinc-500">{FEE_PERCENT}% platform fee on top. Cancel anytime: unspent budget is refunded, the fee isn’t.</p>
                </>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Merch store" description="Optional. Orders using a clipper’s code are credited to them." />
            {shopDomain ? (
              <StorefrontStatus shopDomain={shopDomain} />
            ) : (
              <InlineForm
                id={`store-${c.id}`}
                placeholder="your-store.myshopify.com"
                label="Shopify domain"
                submit="Connect"
                variant="secondary"
                onSubmit={(v) => {
                  const d = ShopDomainSchema.safeParse(v);
                  return d.success ? act((s) => core.connectStore(s, c.id, d.data)) : fail(store, d.error.issues[0].message);
                }}
              />
            )}
          </Card>
          <Card>
            <CardHeader title="Brief" />
            {c.brief && <p className="mb-5 text-sm leading-relaxed text-zinc-600">{c.brief}</p>}
            <RequirementList items={c.requirements} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusActions({ campaign, act }: { campaign: Campaign; act: (fn: (s: core.DemoState) => ActionState) => ActionState }) {
  if (campaign.status === 'completed') return null;
  return (
    <>
      {campaign.status !== 'active' && (
        <Button size="sm" onClick={() => act((s) => core.setCampaignStatus(s, campaign.id, 'active'))}>
          Go live
        </Button>
      )}
      {campaign.status === 'active' && (
        <Button size="sm" variant="secondary" onClick={() => act((s) => core.setCampaignStatus(s, campaign.id, 'paused'))}>
          Pause
        </Button>
      )}
    </>
  );
}

/** Shrinks an uploaded image to at most 960px wide as a JPEG data URL, so it fits in browser storage. */
async function downscale(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 960 / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function NewCampaign({ store }: { store: Store }) {
  const [state, setState] = useState<ActionState>();
  const [busy, setBusy] = useState(false);
  const { brandName } = core.brandDashboard(store.state);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = CampaignSchema.safeParse(campaignInput(form));
    if (!parsed.success) return setState({ error: parsed.error.issues[0].message });
    const file = form.get('thumbnail');
    const thumb = file instanceof File && file.size > 0 ? file : null;
    const thumbErr = thumbnailError(thumb);
    if (thumbErr) return setState({ error: thumbErr });

    setBusy(true);
    let thumbnail_url: string | null = null;
    try {
      if (thumb) thumbnail_url = await downscale(thumb);
    } catch {
      setBusy(false);
      return setState({ error: 'That image couldn’t be read. Try a different file.' });
    }
    const { asset_folder_url, ...rest } = parsed.data;
    let id = '';
    store.run((s) => {
      id = core.createCampaign(s, { ...rest, asset_folder_url: asset_folder_url || null, thumbnail_url });
      return { success: 'Draft created. Fund escrow, then go live.' };
    });
    setBusy(false);
    go(`campaign-${id}`);
  };

  return (
    <>
      <div className="mb-6">
        <BackLink href="#brand">Campaigns</BackLink>
      </div>
      <PageHeader title="New campaign" description="Campaigns start as drafts. Fund escrow, then go live." />
      <form onSubmit={submit} noValidate>
        <CampaignFormBody
          brandName={brandName}
          footer={
            <div className="space-y-3">
              <FormMessage state={state} />
              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Creating…' : 'Create draft campaign'}
                </Button>
              </div>
            </div>
          }
        />
      </form>
    </>
  );
}

// ─── Creator ───────────────────────────────────────────────────────────────
function connectTikTok(store: Store) {
  store.run((s, v) => {
    core.connectTikTok(s, v);
    return { success: 'TikTok connected (mock).' };
  });
}
function Payouts({ store }: { store: Store }) {
  const d = core.creatorDashboard(store.state, store.viewer);
  return (
    <div className="space-y-8">
      <PageHeader title="Payouts" description="Where your earnings go. Set up once, then get paid for every approved clip." actions={<ViewAs store={store} />} />
      <PayoutsView
        key={store.viewer}
        setup={d.payout}
        onSave={(method, handle) => {
          if (method === 'stripe') return store.run((st, v) => core.setPayoutMethod(st, v, 'stripe', null), { quiet: true });
          const parsed = PayoutHandleSchema.safeParse({ method, handle });
          if (!parsed.success) return { error: parsed.error.issues[0].message };
          return store.run((st, v) => core.setPayoutMethod(st, v, parsed.data.method, parsed.data.handle), { quiet: true });
        }}
        stripeForm={
          <MockOnboarding
            onDone={() =>
              store.run((s, v) => {
                core.enablePayouts(s, v);
                return { success: 'Payouts are on (mock).' };
              }, { quiet: true })
            }
          />
        }
        manageStripe={<p className="self-center text-xs text-zinc-500">In the real app, “Open Stripe dashboard” shows payout history, bank details and tax forms.</p>}
      />
    </div>
  );
}

function ViewAs({ store }: { store: Store }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="view-as" className="shrink-0 text-sm text-zinc-500">
        Viewing as
      </label>
      <Select id="view-as" value={store.viewer} onChange={(e) => store.setViewer(e.target.value)} className="h-10 w-44">
        {core.demoCreators(store.state).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function SubmitForm({ store, campaignId, handle }: { store: Store; campaignId: string; handle: string | null }) {
  return (
    <InlineForm
      id={`submit-${campaignId}`}
      type="url"
      placeholder="Link to your clip"
      label="Clip link"
      submit="Submit clip"
      stackOnPhone
      onSubmit={(v) => store.run((s, viewer) => core.submitVideo(s, viewer, campaignId, v))}
      hint={`TikTok, Shorts or Reels link. Try https://youtube.com/shorts/dQw4w9WgXcQ${handle ? ` or https://www.tiktok.com/@${handle}/video/7399999999999999999` : ''}`}
    />
  );
}

function CreatorHome({ store }: { store: Store }) {
  const d = core.creatorDashboard(store.state, store.viewer);
  const subs = d.enrollments.map((e) => e.submission).filter((s) => s !== null);
  const firstOpen = d.enrollments.find((e) => !e.submission);
  return (
    <div className="space-y-8">
      <PageHeader title={`Hi, ${d.name}`} description="Your campaigns, clip codes and earnings." actions={<ViewAs store={store} />} />

      <Checklist
        title="How to start earning"
        steps={[
          {
            label: 'Pick a campaign',
            detail: 'Browse Discover and join a streamer you like clipping. It’s free.',
            done: d.enrollments.length > 0,
            action: (
              <a href="#discover" className={buttonClass('primary', 'sm')}>
                Discover
              </a>
            ),
          },
          {
            label: 'Post your first clip',
            detail: 'Open the campaign. The “Your next step” box walks you through it.',
            done: subs.length > 0,
            action: firstOpen ? (
              <a href={`#offer-${firstOpen.campaign.id}`} className={buttonClass('primary', 'sm')}>
                Open campaign
              </a>
            ) : undefined,
          },
          {
            label: 'Set up payouts',
            detail: 'Choose a bank, debit card, PayPal or Venmo so you can be paid.',
            done: d.payoutsEnabled,
            action: (
              <a href="#payouts" className={buttonClass('primary', 'sm')}>
                Set up payouts
              </a>
            ),
          },
        ]}
      />

      <StatGrid
        items={[
          { label: 'Earned', value: usd(subs.reduce((a, s) => a + s.payout_earned, 0)) },
          { label: 'Paid out', value: usd(subs.reduce((a, s) => a + s.payout_transferred, 0)) },
          { label: 'Verified views', value: compact(subs.reduce((a, s) => a + s.current_view_count, 0)) },
          { label: 'Merch orders', value: compact(subs.reduce((a, s) => a + s.current_conversions, 0)) },
        ]}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Your campaigns</h2>
        {d.enrollments.length === 0 ? (
          <Empty
            icon={<Compass />}
            title="No campaigns yet"
            body="Find a streamer you like clipping in Discover."
            action={
              <a href="#discover" className={buttonClass('primary')}>
                Browse campaigns
              </a>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {d.enrollments.map((e) => (
              <EnrollmentCard
                key={e.enrollment.id}
                {...e}
                href={`#offer-${e.campaign.id}`}
                submitForm={
                  <a href={`#offer-${e.campaign.id}`} className={buttonClass('primary', 'md', 'w-full')}>
                    Post your clip
                  </a>
                }
              />
            ))}
          </div>
        )}
      </section>

      {d.openCampaigns.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Open now</h2>
            <a href="#discover" className="text-sm text-zinc-500 hover:text-zinc-900">
              See all {d.openCampaigns.length}
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.openCampaigns.slice(0, 3).map((c) => (
              <MarketCard key={c.id} c={c} href={`#offer-${c.id}`} />
            ))}
          </div>
        </section>
      )}

      <Card>
        <h2 className="mb-4 font-semibold tracking-tight">Accounts</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ConnectionCard
            icon={<Music2 />}
            title="TikTok"
            connected={!!d.tiktok}
            detail={d.tiktok ? `@${d.tiktok.username} · ${compact(d.tiktok.followers ?? 0)} followers` : 'Needed for TikTok clips only'}
            action={
              <Button size="sm" variant={d.tiktok ? 'ghost' : 'secondary'} onClick={() => connectTikTok(store)}>
                {d.tiktok ? 'Reconnect' : 'Connect'}
              </Button>
            }
          />
          <ConnectionCard
            icon={<Wallet />}
            title="Payouts"
            connected={d.payoutsEnabled}
            detail={d.payoutsEnabled ? payoutDestination(d.payout) : 'Not set up'}
            action={
              <a href="#payouts" className={buttonClass(d.payoutsEnabled ? 'ghost' : 'secondary', 'sm')}>
                {d.payoutsEnabled ? 'Manage' : 'Set up'}
              </a>
            }
          />
        </div>
      </Card>
    </div>
  );
}

function Discover({ store }: { store: Store }) {
  const { openCampaigns } = core.creatorDashboard(store.state, store.viewer);
  return (
    <>
      <PageHeader title="Discover" description="Streamers looking for clippers. Rates are paid on views the platforms report, never screenshots." actions={<ViewAs store={store} />} />
      {openCampaigns.length === 0 ? (
        <Empty icon={<Compass />} title="You’ve joined everything open" body="New campaigns show up here as soon as streamers go live." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {openCampaigns.map((c) => (
            <MarketCard key={c.id} c={c} href={`#offer-${c.id}`} />
          ))}
        </div>
      )}
    </>
  );
}

function Offer({ store, id }: { store: Store; id: string }) {
  const d = core.creatorCampaign(store.state, store.viewer, id);
  if (!d) {
    return (
      <Empty
        icon={<Compass />}
        title="Campaign not available"
        body="It may have ended or been removed by a reset."
        action={
          <a href="#discover" className={buttonClass('secondary')}>
            Back to Discover
          </a>
        }
      />
    );
  }
  const { campaign: c } = d;
  const r = rateParts(c);
  const me = core.creatorDashboard(store.state, store.viewer);
  const merchLink = d.enrollment ? trackingLink(d.shopDomain, d.enrollment.ref_param) : null;

  return (
    <div className="space-y-6">
      <BackLink href="#discover">Discover</BackLink>
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
                <Button className="w-full" onClick={() => store.run((s, v) => core.joinCampaign(s, v, c.id))}>
                  Join campaign
                </Button>
              }
              submitForm={<SubmitForm store={store} campaignId={c.id} handle={me.tiktok?.username ?? null} />}
              tiktokPrompt={
                c.platforms.includes('tiktok') && !d.tiktokConnected ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
                    <span>Posting on TikTok? Connect it first so we can read your views.</span>
                    <Button size="sm" variant="secondary" onClick={() => connectTikTok(store)}>
                      Connect
                    </Button>
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
                  <Button size="sm" variant="secondary" onClick={() => store.run((s, v) => core.claimMoment(s, v, m.id))}>
                    Claim
                  </Button>
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
              <li>
                Earnings stop at {usd(c.cpm_cap)} per clipper. You keep all of it: there are no fees for clippers.
              </li>
              <li>If {c.brandName} hasn’t reviewed a clean clip with #ad after {c.auto_approve_hours} hours, it’s approved automatically.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Small pieces ──────────────────────────────────────────────────────────
function fail(store: Store, error: string): ActionState {
  store.notify({ error });
  return { error };
}

/** One input + button. Results show in the toast; the input clears on success. */
function InlineForm({
  id,
  label,
  placeholder,
  submit,
  onSubmit,
  type = 'text',
  prefix,
  variant = 'primary',
  stackOnPhone,
  hint,
}: {
  id: string;
  label: string;
  placeholder: string;
  submit: string;
  onSubmit: (value: string) => ActionState;
  type?: string;
  prefix?: string;
  variant?: 'primary' | 'secondary';
  stackOnPhone?: boolean;
  hint?: string;
}) {
  const [value, setValue] = useState('');
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const result = onSubmit(value.trim());
        if (!result?.error) setValue('');
      }}
    >
      <div className={stackOnPhone ? 'flex flex-col gap-2 sm:flex-row' : 'flex gap-2'}>
        <div className="relative min-w-0 flex-1">
          {prefix && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-zinc-400">{prefix}</span>}
          <Input
            id={id}
            type={type}
            inputMode={type === 'number' ? 'decimal' : undefined}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            aria-label={label}
            className={prefix ? 'pl-7' : undefined}
          />
        </div>
        <Button type="submit" variant={variant}>
          {submit}
        </Button>
      </div>
      {hint && <p className="break-all text-xs text-zinc-500">{hint}</p>}
    </form>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
