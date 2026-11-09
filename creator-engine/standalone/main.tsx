// Standalone demo: the Creator Engine UI running entirely in the browser, for a
// shareable link. Uses the same components, payout/fee/fraud logic and demo core
// as the Next.js app. State is kept in this browser's localStorage when available.
// Build: npm run build:demo
import { useEffect, useReducer, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, CircleDollarSign, Eye, Link2, Megaphone, Music2, Plus, ShieldCheck, ShoppingBag, Sparkles, Users, Wallet } from 'lucide-react';
import * as core from '@/lib/demo-core';
import { compact, payoutModelLabel, termsLabel, usd } from '@/lib/format';
import { CampaignSchema, DepositSchema, ShopDomainSchema } from '@/lib/schemas';
import type { ActionState } from '@/actions/result';
import type { Campaign, PayoutModel } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClass } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { Stat } from '@/components/ui/stat';
import { Empty } from '@/components/ui/empty';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { FormMessage } from '@/components/form-message';
import { CampaignBadge } from '@/components/status';
import {
  CampaignRow,
  ConnectionCard,
  DemoBar,
  EnrollmentCard,
  OpenCampaignCard,
  StorefrontStatus,
  SubmissionCard,
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
const STORAGE_KEY = 'creator-engine-demo-v1';

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
    // storage blocked or corrupt — start fresh
  }
  return fresh();
}

function save(saved: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // storage unavailable: the demo still works for this visit
  }
}

// ─── Routing on plain #names ───────────────────────────────────────────────
type Route = { name: 'home' } | { name: 'brand' } | { name: 'new-campaign' } | { name: 'creator' } | { name: 'campaign'; id: string };

function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (h === 'brand') return { name: 'brand' };
  if (h === 'creator') return { name: 'creator' };
  if (h === 'new-campaign') return { name: 'new-campaign' };
  if (h.startsWith('campaign-')) return { name: 'campaign', id: h.slice('campaign-'.length) };
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

// ─── App shell ─────────────────────────────────────────────────────────────
function App() {
  const store = useStore();
  const route = useRoute();

  return (
    <>
      <Header onReset={store.reset} />
      {route.name === 'home' ? (
        <Landing />
      ) : (
        <main className="gutter mx-auto max-w-6xl py-10 sm:py-12">
          {route.name === 'brand' && <BrandDashboard store={store} />}
          {route.name === 'new-campaign' && <NewCampaign store={store} />}
          {route.name === 'campaign' && <CampaignPage store={store} id={route.id} />}
          {route.name === 'creator' && <CreatorPage store={store} />}
        </main>
      )}
      <Toast state={store.toast} />
    </>
  );
}

function Header({ onReset }: { onReset: () => void }) {
  const link = 'rounded-full px-3 py-1.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900';
  return (
    <header className="site-header sticky z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur">
      <div className="gutter mx-auto flex h-16 max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <a href="#home" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-zinc-900 text-white">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 17 9.5 11l4 4L20 8" />
              </svg>
            </span>
            <span className="hidden min-[400px]:inline">Creator Engine</span>
          </a>
          <Badge tone="amber" className="hidden sm:inline-flex">
            Demo · mock money
          </Badge>
        </div>
        <nav className="flex items-center gap-0.5 text-sm">
          <a href="#brand" className={link}>
            Brands
          </a>
          <a href="#creator" className={link}>
            Creators
          </a>
          <button type="button" onClick={onReset} className={link}>
            Reset
          </button>
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
        className={`toast-in pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm shadow-lg ring-1 ${
          state.error ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-zinc-900 text-white ring-zinc-900'
        }`}
      >
        {state.error ?? state.success}
      </p>
    </div>
  );
}

// ─── Landing ───────────────────────────────────────────────────────────────
function Landing() {
  const features = [
    { icon: ShieldCheck, title: 'Fraud engine', body: 'Perceptual hashing catches re-uploaded videos. A velocity watchdog freezes payouts on bot-like view spikes.' },
    { icon: Link2, title: 'Revenue attribution', body: 'Every creator gets a unique code and ?ref= link. Storefront webhooks tie each order back to the video that drove it.' },
    { icon: Wallet, title: 'Escrow payouts', body: 'Brands fund once. Creators are paid through Stripe Connect as they hit verified milestones, with the fee taken inline.' },
  ];
  const steps = [
    ['Fund a campaign', 'Set a payout model (hybrid, CPM or per-sale) and deposit escrow.'],
    ['Creators connect & post', 'TikTok login proves ownership. No self-reported view counts.'],
    ['Pay on proof', 'Views sync automatically, sales attribute server-side, payouts release from escrow.'],
  ];
  return (
    <main className="gutter mx-auto max-w-6xl">
      <section className="grid grid-cols-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0">
          <Badge tone="green" dot>
            Paid on proof, not vanity metrics
          </Badge>
          <h1 className="balance mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">Pay creators for the revenue they drive.</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Run creator campaigns where views are API-verified, fraud is caught automatically and every sale is traced back to the video behind it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#brand" className={buttonClass('primary')}>
              Open brand demo <ArrowRight className="size-4" />
            </a>
            <a href="#creator" className={buttonClass('secondary')}>
              Open creator demo
            </a>
          </div>
          <p className="mt-4 text-sm text-zinc-500">Everything here is fake: fictional creators and brands, made-up numbers, mock money.</p>
        </div>
        <HeroPreview />
      </section>

      <section className="grid grid-cols-1 gap-4 pb-14 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="flex flex-col gap-4">
            <span className="grid size-10 place-items-center rounded-xl bg-zinc-900 text-white">
              <f.icon className="size-[18px]" />
            </span>
            <div>
              <h3 className="font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{f.body}</p>
            </div>
          </Card>
        ))}
      </section>

      <section className="pb-20">
        <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-zinc-200/80 bg-white/60 p-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-50 text-sm font-semibold text-accent-700">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-medium">{title}</p>
                <p className="mt-1 text-sm text-zinc-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function HeroPreview() {
  const bars = [32, 44, 38, 56, 50, 68, 74, 66, 82, 90];
  return (
    <Card className="min-w-0 p-6 sm:p-7" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">Voltline Zero — Launch Week</p>
          <p className="text-xs text-zinc-500">Hybrid · $4 CPM</p>
        </div>
        <Badge tone="green" dot>
          Live
        </Badge>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Views', '4.8M'],
          ['Orders', '938'],
          ['Escrow', '$31k'],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-xl bg-zinc-50 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{k}</p>
            <p className="mt-0.5 truncate text-lg font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex h-24 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-md bg-zinc-900" style={{ height: `${h}%`, opacity: 0.2 + (i / bars.length) * 0.75 }} />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {(
          [
            ['@kiraonair', 1],
            ['@novaplays', 0.96],
          ] as const
        ).map(([name, pct]) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-sm text-zinc-600">{name}</span>
            <div className="min-w-0 flex-1">
              <Progress value={pct} max={1} />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-sm text-zinc-600">@clipfarm.247</span>
          <div className="flex min-w-0 flex-1 justify-end">
            <Badge tone="red">Bot activity · paused</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Brand ─────────────────────────────────────────────────────────────────
function BrandDashboard({ store }: { store: Store }) {
  const { brandName, campaigns } = core.brandDashboard(store.state);
  const total = (k: 'escrow_balance' | 'views' | 'conversions' | 'earned') => campaigns.reduce((a, c) => a + c[k], 0);
  return (
    <>
      <PageHeader
        eyebrow={<span className="text-sm font-medium text-zinc-500">{brandName}</span>}
        title="Campaigns"
        description="Escrow, verified reach and attributed sales across every campaign."
        actions={
          <a href="#new-campaign" className={buttonClass('primary')}>
            <Plus className="size-4" /> New campaign
          </a>
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Escrow held" value={usd(total('escrow_balance'))} icon={<Wallet />} />
        <Stat label="Verified views" value={compact(total('views'))} icon={<Eye />} />
        <Stat label="Orders" value={compact(total('conversions'))} icon={<ShoppingBag />} />
        <Stat label="Earnings" value={usd(total('earned'))} icon={<CircleDollarSign />} />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-3">
        {campaigns.length === 0 ? (
          <Empty icon={<Megaphone />} title="No campaigns yet" body="Create a campaign, fund escrow and go live to start receiving creator submissions." />
        ) : (
          campaigns.map((c) => (
            <a key={c.id} href={`#campaign-${c.id}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20">
              <CampaignRow c={c} />
            </a>
          ))
        )}
      </div>
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
  const { campaign: c, submissions, shopDomain, deposited, paidOut, fees } = detail;
  const act = (fn: (s: core.DemoState) => ActionState) => store.run((s) => fn(s));

  return (
    <>
      <BackLink href="#brand">Campaigns</BackLink>
      <PageHeader
        eyebrow={<CampaignBadge status={c.status} />}
        title={c.title}
        description={`${payoutModelLabel[c.payout_model]} · ${termsLabel(c)}`}
        actions={<StatusActions campaign={c} act={act} />}
      />
      <DemoBar>
        <Button size="sm" variant="secondary" onClick={() => act((s) => core.simulateSync(s, c.id))}>
          Run 4h sync
        </Button>
        <Button size="sm" variant="secondary" onClick={() => act((s) => core.simulateSale(s, c.id))}>
          Simulate sale
        </Button>
      </DemoBar>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Escrow balance" value={usd(c.escrow_balance)} hint={`${usd(deposited)} deposited`} />
        <Stat label="Paid out" value={usd(paidOut)} hint={`${usd(fees)} platform fees`} />
        <Stat label="Verified views" value={compact(submissions.reduce((a, s) => a + s.current_view_count, 0))} />
        <Stat label="Orders" value={compact(submissions.reduce((a, s) => a + s.current_conversions, 0))} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader title="Submissions" description="Views sync from TikTok every 4 hours. Flagged videos stop earning." />
          {submissions.length === 0 ? (
            <Empty icon={<Users />} title="No submissions yet" body="Creators who join appear here once they submit a live video." />
          ) : (
            <ul className="space-y-3">
              {submissions.map((s) => {
                const kinds = submissionActionKinds(s);
                return (
                  <SubmissionCard
                    key={s.id}
                    s={s}
                    cap={c.cpm_cap}
                    actions={
                      kinds.length ? (
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
                      ) : undefined
                    }
                  />
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Fund escrow" description="Mock money — adds to escrow instantly." />
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
          </Card>
          <Card>
            <CardHeader title="Storefront" description="Orders from this store are matched to creator codes and links." />
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
        </div>
      </div>
    </>
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

const MODEL_HELP: Record<PayoutModel, string> = {
  hybrid: 'A guaranteed base fee plus CPM on verified views.',
  pure_cpm: 'Creators earn only on verified views.',
  cps_performance: 'Creators earn a commission on attributed sales.',
};

function NewCampaign({ store }: { store: Store }) {
  const [model, setModel] = useState<PayoutModel>('hybrid');
  const [state, setState] = useState<ActionState>();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (model !== 'hybrid') data.base_payout = '0';
    if (model === 'cps_performance') data.cpm_rate = '0';
    if (model !== 'cps_performance') data.cps_commission_pct = '0';
    const parsed = CampaignSchema.safeParse(data);
    if (!parsed.success) return setState({ error: parsed.error.issues[0].message });
    const { asset_folder_url, ...rest } = parsed.data;
    let id = '';
    store.run((s) => {
      id = core.createCampaign(s, { ...rest, asset_folder_url: asset_folder_url || null });
      return { success: 'Draft created. Fund escrow, then go live.' };
    });
    go(`campaign-${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="#brand">Campaigns</BackLink>
      <PageHeader title="New campaign" description="Campaigns start as drafts. Fund escrow, then go live." />
      <Card>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Campaign title" className="sm:col-span-2">
              <Input id="title" name="title" placeholder="Speedrun Sunday" />
            </Field>
            <Field label="Payout model" hint={MODEL_HELP[model]} className="sm:col-span-2">
              <Select id="payout_model" name="payout_model" value={model} onChange={(e) => setModel(e.target.value as PayoutModel)}>
                <option value="hybrid">Hybrid — base + CPM</option>
                <option value="pure_cpm">Pure CPM</option>
                <option value="cps_performance">Cost per sale</option>
              </Select>
            </Field>
            <Field label="Base payout ($)" hint={model === 'hybrid' ? 'Paid once approved.' : 'Not used by this model.'}>
              <Input id="base_payout" name="base_payout" type="number" inputMode="decimal" min="0" step="0.01" defaultValue="200" disabled={model !== 'hybrid'} />
            </Field>
            <Field label="CPM rate ($ per 1,000 views)">
              <Input id="cpm_rate" name="cpm_rate" type="number" inputMode="decimal" min="0" step="0.01" defaultValue="3" disabled={model === 'cps_performance'} />
            </Field>
            <Field label="Sales commission (%)">
              <Input id="cps_commission_pct" name="cps_commission_pct" type="number" inputMode="decimal" min="0" max="100" step="0.1" defaultValue="10" disabled={model !== 'cps_performance'} />
            </Field>
            <Field label="Cap per creator ($)" hint="The most any one creator can earn.">
              <Input id="cpm_cap" name="cpm_cap" type="number" inputMode="decimal" min="1" step="0.01" defaultValue="2500" />
            </Field>
            <Field label="Discount code prefix" hint="Each creator gets PREFIX + 4 characters.">
              <Input id="code_prefix" name="code_prefix" placeholder="RUN" className="uppercase" />
            </Field>
            <Field label="Brief & raw footage link" hint="Optional.">
              <Input id="asset_folder_url" name="asset_folder_url" type="url" placeholder="https://…" />
            </Field>
          </div>
          <FormMessage state={state} />
          <div className="flex justify-end">
            <Button type="submit">Create draft campaign</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Creator ───────────────────────────────────────────────────────────────
function CreatorPage({ store }: { store: Store }) {
  const d = core.creatorDashboard(store.state, store.viewer);
  const subs = d.enrollments.map((e) => e.submission).filter((s) => s !== null);
  const creators = core.demoCreators(store.state);

  return (
    <>
      <PageHeader
        title={`Hi, ${d.name}`}
        description="Your campaigns, codes and verified earnings."
        actions={
          <div className="flex items-center gap-2">
            <label htmlFor="view-as" className="shrink-0 text-sm text-zinc-500">
              Viewing as
            </label>
            <Select id="view-as" value={store.viewer} onChange={(e) => store.setViewer(e.target.value)} className="h-10 w-44">
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ConnectionCard
          icon={<Music2 />}
          title="TikTok"
          connected={!!d.tiktok}
          detail={d.tiktok ? `@${d.tiktok.username} · ${compact(d.tiktok.followers ?? 0)} followers` : 'Required to verify your videos and views.'}
          action={
            <Button
              size="sm"
              variant={d.tiktok ? 'ghost' : 'primary'}
              onClick={() =>
                store.run((s, v) => {
                  core.connectTikTok(s, v);
                  return { success: 'TikTok connected (mock).' };
                })
              }
            >
              {d.tiktok ? 'Reconnect' : 'Connect TikTok'}
            </Button>
          }
        />
        <ConnectionCard
          icon={<Wallet />}
          title="Payouts"
          connected={d.payoutsEnabled}
          detail={d.payoutsEnabled ? 'Stripe Express account active.' : 'Set up Stripe to receive transfers.'}
          action={
            <Button
              size="sm"
              variant={d.payoutsEnabled ? 'ghost' : 'primary'}
              onClick={() =>
                store.run((s, v) => {
                  core.enablePayouts(s, v);
                  return { success: 'Payout account ready (mock).' };
                })
              }
            >
              {d.payoutsEnabled ? 'Manage' : 'Set up payouts'}
            </Button>
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Earned" value={usd(subs.reduce((a, s) => a + s.payout_earned, 0))} icon={<CircleDollarSign />} />
        <Stat label="Paid out" value={usd(subs.reduce((a, s) => a + s.payout_transferred, 0))} icon={<Wallet />} />
        <Stat label="Verified views" value={compact(subs.reduce((a, s) => a + s.current_view_count, 0))} icon={<Eye />} />
        <Stat label="Orders" value={compact(subs.reduce((a, s) => a + s.current_conversions, 0))} icon={<ShoppingBag />} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">My campaigns</h2>
        {d.enrollments.length === 0 ? (
          <Empty icon={<Sparkles />} title="You haven’t joined a campaign" body="Pick one below. You’ll get a personal discount code and tracking link instantly." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {d.enrollments.map((e) => (
              <EnrollmentCard
                key={e.enrollment.id}
                {...e}
                submitForm={
                  <InlineForm
                    id={`submit-${e.campaign.id}`}
                    type="url"
                    placeholder="https://www.tiktok.com/@you/video/…"
                    label="Live video link"
                    submit="Submit video"
                    stackOnPhone
                    onSubmit={(v) => store.run((s, viewer) => core.submitVideo(s, viewer, e.campaign.id, v))}
                    hint={`Try https://www.tiktok.com/@${d.tiktok?.username ?? 'you'}/video/73${String(Date.now()).slice(-17)}`}
                  />
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Open campaigns</h2>
        {d.openCampaigns.length === 0 ? (
          <Empty icon={<Sparkles />} title="Nothing open right now" body="New campaigns appear here as soon as brands go live." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.openCampaigns.map((c) => (
              <OpenCampaignCard
                key={c.id}
                c={c}
                action={
                  <Button size="sm" onClick={() => store.run((s, v) => core.joinCampaign(s, v, c.id))}>
                    Join
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ─── Small pieces ──────────────────────────────────────────────────────────
function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
      <ArrowLeft className="size-4" /> {children}
    </a>
  );
}

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
