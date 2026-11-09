// Standalone demo: the Creator Engine UI running entirely in the browser, for a
// shareable link. Uses the same components, payout/fee/fraud logic and demo core
// as the Next.js app. State is kept in this browser's localStorage when available.
// Build: npm run build:demo
import { useEffect, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, Compass, House, LayoutList, Megaphone, Music2, Plus, RotateCcw, Users, Wallet } from 'lucide-react';
import * as core from '@/lib/demo-core';
import { compact, payoutModelLabel, rateParts, usd } from '@/lib/format';
import { CampaignSchema, DepositSchema, ShopDomainSchema, thumbnailError } from '@/lib/schemas';
import type { ActionState } from '@/actions/result';
import type { Campaign } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Button, buttonClass } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { StatGrid } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { PageHeader } from '@/components/ui/page-header';
import { FormMessage } from '@/components/form-message';
import { CampaignBadge } from '@/components/status';
import { AppShell, type NavSection } from '@/components/app-shell';
import { Landing } from '@/components/landing';
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
  RequirementList,
  StorefrontStatus,
  SubmissionTable,
  submissionActionKinds,
} from '@/components/views';

// Fictional creators for the shareable demo.
const ROSTER: core.CreatorSeed[] = [
  { handle: 'novaplays', displayName: 'Nova Reyes', followers: 1_800_000 },
  { handle: 'kiraonair', displayName: 'Kira Vance', followers: 4_600_000 },
  { handle: 'mattbuilds', displayName: 'Matt Ortega', followers: 920_000 },
  { handle: 'junolive', displayName: 'Juno Park', followers: 1_100_000 },
  { handle: 'pixelpriya', displayName: 'Priya Shah', followers: 2_100_000 },
  { handle: 'rexruns', displayName: 'Rex Moreno', followers: 1_300_000 },
  { handle: 'sablestreams', displayName: 'Sable Quinn', followers: 640_000 },
];
const FEE_PERCENT = 15;
const STORAGE_KEY = 'creator-engine-demo-v2';

interface Saved {
  state: core.DemoState;
  viewer: string;
}

function fresh(): Saved {
  const state = core.seedDemo(ROSTER, FEE_PERCENT);
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
  | { name: 'brand' }
  | { name: 'new-campaign' }
  | { name: 'campaign'; id: string }
  | { name: 'creator' }
  | { name: 'discover' }
  | { name: 'offer'; id: string };

function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (h === 'brand' || h === 'creator' || h === 'discover' || h === 'new-campaign') return { name: h };
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
  const run = (fn: (s: core.DemoState, viewer: string) => ActionState | void): ActionState => {
    const result = fn(ref.current.state, ref.current.viewer) ?? undefined;
    save(ref.current);
    rerender();
    notify(result);
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
const SECTIONS: NavSection[] = [
  {
    title: 'Brand',
    items: [
      { href: '#brand', label: 'Campaigns', icon: <LayoutList /> },
      { href: '#new-campaign', label: 'New campaign', icon: <Plus /> },
    ],
  },
  {
    title: 'Creator',
    items: [
      { href: '#creator', label: 'Home', icon: <House /> },
      { href: '#discover', label: 'Discover', icon: <Compass /> },
    ],
  },
];

const CURRENT: Record<Route['name'], string | null> = {
  home: null,
  brand: '#brand',
  campaign: '#brand',
  'new-campaign': '#new-campaign',
  creator: '#creator',
  discover: '#discover',
  offer: '#discover',
};

function App() {
  const store = useStore();
  const route = useRoute();

  if (route.name === 'home') {
    return (
      <>
        <LandingHeader />
        <Landing brandHref="#brand" creatorHref="#discover" />
        <Toast state={store.toast} />
      </>
    );
  }

  return (
    <>
      <AppShell
        sections={SECTIONS}
        current={CURRENT[route.name]}
        homeHref="#home"
        demo
        footer={
          <button
            type="button"
            onClick={store.reset}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 [&>svg]:size-4"
          >
            <RotateCcw /> Reset demo
          </button>
        }
      >
        {route.name === 'brand' && <BrandDashboard store={store} />}
        {route.name === 'new-campaign' && <NewCampaign store={store} />}
        {route.name === 'campaign' && <CampaignPage store={store} id={route.id} />}
        {route.name === 'creator' && <CreatorHome store={store} />}
        {route.name === 'discover' && <Discover store={store} />}
        {route.name === 'offer' && <Offer store={store} id={route.id} />}
      </AppShell>
      <Toast state={store.toast} />
    </>
  );
}

function LandingHeader() {
  const link = 'rounded-md px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900';
  return (
    <header className="site-header sticky z-20 border-b border-zinc-200/70 bg-zinc-50/85 backdrop-blur">
      <div className="gutter mx-auto flex h-16 max-w-6xl items-center justify-between gap-3">
        <a href="#home" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-900 text-white">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17 9.5 11l4 4L20 8" />
            </svg>
          </span>
          <span className="hidden min-[400px]:inline">Creator Engine</span>
        </a>
        <nav className="flex items-center gap-0.5 text-sm">
          <a href="#brand" className={link}>
            Brands
          </a>
          <a href="#discover" className={link}>
            Creators
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
  return (
    <>
      <PageHeader
        eyebrow={<span className="text-sm text-zinc-500">{brandName}</span>}
        title="Campaigns"
        description={pending ? `${pending} ${pending === 1 ? 'video is' : 'videos are'} waiting for your review.` : 'Everything is reviewed. Nice.'}
        actions={
          <a href="#new-campaign" className={buttonClass('primary')}>
            <Plus className="size-4" /> New campaign
          </a>
        }
      />
      <StatGrid
        items={[
          { label: 'Escrow held', value: usd(sum((c) => c.escrow_balance)) },
          { label: 'Committed to creators', value: usd(sum((c) => c.budget.committed)) },
          { label: 'Verified views', value: compact(sum((c) => c.views)) },
          { label: 'Attributed orders', value: compact(sum((c) => c.conversions)) },
        ]}
      />
      <Card flush className="mt-8 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-5">
            <Empty icon={<Megaphone />} title="No campaigns yet" body="Create a campaign, fund escrow and go live to start receiving creator videos." />
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
  const { campaign: c, submissions, shopDomain, deposited, paidOut, fees, budget } = detail;
  const r = rateParts(c);
  const act = (fn: (s: core.DemoState) => ActionState) => store.run((s) => fn(s));

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
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusActions campaign={c} act={act} />
          </div>
        </div>
      </div>

      <DemoBar>
        <Button size="sm" variant="secondary" onClick={() => act((s) => core.simulateSync(s, c.id))}>
          Run 4h sync
        </Button>
        <Button size="sm" variant="secondary" onClick={() => act((s) => core.simulateSale(s, c.id))}>
          Simulate sale
        </Button>
      </DemoBar>

      <StatGrid
        items={[
          { label: 'Escrow balance', value: usd(c.escrow_balance), hint: `${usd(deposited)} deposited` },
          { label: 'Paid to creators', value: usd(paidOut), hint: `${usd(fees)} platform fees` },
          { label: 'Verified views', value: compact(submissions.reduce((a, s) => a + s.current_view_count, 0)) },
          { label: 'Attributed orders', value: compact(submissions.reduce((a, s) => a + s.current_conversions, 0)) },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <Card className="min-w-0 self-start">
          <CardHeader title="Submissions" description={`Views sync every 4 hours. Clean videos with #ad auto-approve after ${c.auto_approve_hours}h.`} />
          {submissions.length === 0 ? (
            <Empty icon={<Users />} title="No submissions yet" body="Creators who join appear here once they submit a live video." />
          ) : (
            <SubmissionTable
              rows={submissions}
              cap={c.cpm_cap}
              autoApproveHours={c.auto_approve_hours}
              actions={(s) => {
                const kinds = submissionActionKinds(s);
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

        <div className="space-y-6">
          <Card>
            <CardHeader title="Budget" description={`${usd(budget.available)} free to earn`} />
            <BudgetMeter budget={budget} />
            <div className="mt-5 border-t border-zinc-100 pt-5">
              <InlineForm
                id={`deposit-${c.id}`}
                placeholder="2,000"
                prefix="$"
                type="number"
                label="Deposit amount"
                submit="Deposit"
                onSubmit={(v) => {
                  const amount = DepositSchema.safeParse(v);
                  return amount.success ? act((s) => core.fundEscrow(s, c.id, amount.data)) : fail(store, amount.error.issues[0].message);
                }}
              />
              <p className="mt-2 text-xs text-zinc-500">Mock money. Adds to escrow instantly.</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Storefront" description="Orders are matched to creator codes and links." />
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
      {campaign.status !== 'draft' && (
        <Button size="sm" variant="secondary" onClick={() => act((s) => core.setCampaignStatus(s, campaign.id, 'completed'))}>
          Complete
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
    const parsed = CampaignSchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')));
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
function enablePayouts(store: Store) {
  store.run((s, v) => {
    core.enablePayouts(s, v);
    return { success: 'Payout account ready (mock).' };
  });
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
      placeholder="https://www.tiktok.com/@you/video/…"
      label="Live video link"
      submit="Submit video"
      stackOnPhone
      onSubmit={(v) => store.run((s, viewer) => core.submitVideo(s, viewer, campaignId, v))}
      hint={`Paste the link to your live TikTok. Try https://www.tiktok.com/@${handle ?? 'you'}/video/7399999999999999999`}
    />
  );
}

function CreatorHome({ store }: { store: Store }) {
  const d = core.creatorDashboard(store.state, store.viewer);
  const subs = d.enrollments.map((e) => e.submission).filter((s) => s !== null);
  return (
    <div className="space-y-8">
      <PageHeader title={`Hi, ${d.name}`} description="Your campaigns, codes and verified earnings." actions={<ViewAs store={store} />} />

      <Checklist
        steps={[
          {
            label: 'Connect TikTok',
            detail: 'We read your view counts straight from TikTok. No screenshots.',
            done: !!d.tiktok,
            action: (
              <Button size="sm" onClick={() => connectTikTok(store)}>
                Connect TikTok
              </Button>
            ),
          },
          {
            label: 'Set up payouts',
            detail: 'Stripe sends your earnings to your bank.',
            done: d.payoutsEnabled,
            action: (
              <Button size="sm" onClick={() => enablePayouts(store)}>
                Set up payouts
              </Button>
            ),
          },
          {
            label: 'Join a campaign',
            detail: 'You get a personal code and tracking link.',
            done: d.enrollments.length > 0,
            action: (
              <a href="#discover" className={buttonClass('primary', 'sm')}>
                Discover
              </a>
            ),
          },
          { label: 'Submit your first video', detail: 'Paste the TikTok link under the campaign below.', done: subs.length > 0 },
        ]}
      />

      <StatGrid
        items={[
          { label: 'Earned', value: usd(subs.reduce((a, s) => a + s.payout_earned, 0)) },
          { label: 'Paid out', value: usd(subs.reduce((a, s) => a + s.payout_transferred, 0)) },
          { label: 'Verified views', value: compact(subs.reduce((a, s) => a + s.current_view_count, 0)) },
          { label: 'Orders from you', value: compact(subs.reduce((a, s) => a + s.current_conversions, 0)) },
        ]}
      />

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Your campaigns</h2>
        {d.enrollments.length === 0 ? (
          <Empty
            icon={<Compass />}
            title="No campaigns yet"
            body="Find one that fits your content in Discover."
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
                submitForm={<SubmitForm store={store} campaignId={e.campaign.id} handle={d.tiktok?.username ?? null} />}
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
            detail={d.tiktok ? `@${d.tiktok.username} · ${compact(d.tiktok.followers ?? 0)} followers` : 'Not connected'}
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
            detail={d.payoutsEnabled ? 'Stripe Express' : 'Not set up'}
            action={
              <Button size="sm" variant={d.payoutsEnabled ? 'ghost' : 'secondary'} onClick={() => enablePayouts(store)}>
                {d.payoutsEnabled ? 'Manage' : 'Set up'}
              </Button>
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
      <PageHeader title="Discover" description="Open campaigns you haven’t joined. Every rate is paid on verified views or tracked sales." actions={<ViewAs store={store} />} />
      {openCampaigns.length === 0 ? (
        <Empty icon={<Compass />} title="You’ve joined everything open" body="New campaigns show up here as soon as brands go live." />
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

  return (
    <div className="space-y-6">
      <BackLink href="#discover">Discover</BackLink>
      <CampaignCover campaign={c} brandName={c.brandName} variant="banner" className="rounded-xl" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <div>
            <p className="text-sm text-zinc-500">{c.brandName}</p>
            <h1 className="balance mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{c.title}</h1>
          </div>
          {c.brief && (
            <section>
              <h2 className="mb-2 font-semibold tracking-tight">The brief</h2>
              <p className="max-w-prose leading-relaxed text-zinc-600">{c.brief}</p>
            </section>
          )}
          <section>
            <h2 className="mb-3 font-semibold tracking-tight">Requirements</h2>
            <RequirementList items={c.requirements} />
          </section>
          <section>
            <h2 className="mb-2 font-semibold tracking-tight">How you get paid</h2>
            <ul className="max-w-prose list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-600">
              <li>Views are read from TikTok every 4 hours. Self-reported numbers aren’t accepted.</li>
              {c.payout_model === 'cps_performance' && <li>Every order placed with your code or link earns you {c.cps_commission_pct}%.</li>}
              {c.payout_model === 'hybrid' && (
                <li>
                  {usd(c.base_payout)} base fee once your video is approved, plus {r.rate} {r.unit}.
                </li>
              )}
              <li>
                Earnings stop at {usd(c.cpm_cap)} per creator. A {FEE_PERCENT}% platform fee comes out of each payout.
              </li>
              <li>If the brand hasn’t reviewed a clean video with #ad after {c.auto_approve_hours} hours, it’s approved automatically.</li>
            </ul>
          </section>
          {d.enrollment && (
            <EnrollmentCard
              enrollment={d.enrollment}
              campaign={c}
              brandName={c.brandName}
              shopDomain={d.shopDomain}
              submission={d.submission}
              href={`#offer-${c.id}`}
              submitForm={<SubmitForm store={store} campaignId={c.id} handle={me.tiktok?.username ?? null} />}
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
              <EarningsEstimator terms={c} feePercent={FEE_PERCENT} />
            </div>
            <div className="mt-5">
              {d.enrollment ? (
                <p className="rounded-lg bg-accent-50 px-3.5 py-2.5 text-sm text-accent-700">You’ve joined. Your code is on the left.</p>
              ) : !d.tiktokConnected ? (
                <Button className="w-full" onClick={() => connectTikTok(store)}>
                  Connect TikTok to join
                </Button>
              ) : (
                <Button className="w-full" onClick={() => store.run((s, v) => core.joinCampaign(s, v, c.id))}>
                  Join campaign
                </Button>
              )}
            </div>
          </Card>
        </aside>
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
