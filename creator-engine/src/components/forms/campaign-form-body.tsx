'use client';

import { useState } from 'react';
import { Check, Clapperboard, Eye, FileText, Film, Image as ImageIcon, Link2, Loader2, PieChart, Plus, ShieldCheck, Upload, X } from 'lucide-react';
import { Field, Input } from '../ui/field';
import { Card } from '../ui/card';
import { MarketCard } from '../views';
import { PlatformIcon } from '../platform-icon';
import { cn } from '../ui/cn';
import type { PayoutModel, Platform } from '@/lib/types';
import type { MarketCampaign } from '@/lib/data';
import { CATEGORIES, CONTENT_TYPES } from '@/lib/campaign-tags';
import { REF_MAX, REF_MAX_BYTES, kindOf, linkName, type Reference } from '@/lib/references';

const MODELS: { id: PayoutModel; title: string; body: string; icon: React.ElementType }[] = [
  { id: 'pure_cpm', title: 'Per 1K views', body: 'Pay a rate for every 1,000 real views.', icon: Eye },
  { id: 'per_post', title: 'Per post', body: 'A flat amount for each approved clip.', icon: Clapperboard },
  { id: 'pool', title: 'Pool', body: 'One budget, split by share of views.', icon: PieChart },
];

const PLATFORMS: [Platform, string][] = [
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube Shorts'],
  ['instagram', 'Instagram Reels'],
];

const REF_ICON = { link: Link2, image: ImageIcon, video: Film, file: FileText } as const;

const textarea =
  'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 transition focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/5';

const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const views = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(Math.round(n)));

/** A numbered section card. */
function Step({ n, title, sub, children }: { n: number; title: string; sub: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-5 flex items-start gap-3">
        <span className="platform-tile relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-brand font-mono text-sm font-bold text-brand-ink">
          <span className="relative">{n}</span>
        </span>
        <div>
          <h2 className="font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-zinc-500">{sub}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span className={cn('grid size-5 shrink-0 place-items-center rounded-full transition', on ? 'bg-brand text-brand-ink' : 'border border-zinc-300')}>
      {on && <Check className="size-3" strokeWidth={3.5} />}
    </span>
  );
}

/** A money input with a $ in front. */
function Money(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">$</span>
      <Input type="number" inputMode="decimal" step="0.01" {...props} className={cn('pl-7 tabular-nums', props.className)} />
    </div>
  );
}

/**
 * Fields for a new campaign plus a live preview of the Discover card.
 * The caller supplies the <form> and the submit row (`footer`).
 */
export type UploadUrl = (name: string, size: number) => Promise<{ error: string } | { uploadUrl: string; publicUrl: string }>;

export function CampaignFormBody({ brandName, footer, uploadUrl }: { brandName: string; footer: React.ReactNode; uploadUrl: UploadUrl }) {
  const [model, setModel] = useState<PayoutModel>('pure_cpm');
  const [title, setTitle] = useState('');
  const [base, setBase] = useState('20');
  const [cpm, setCpm] = useState('3');
  const [min, setMin] = useState('5');
  const [cap, setCap] = useState('500');
  const [platforms, setPlatforms] = useState<Platform[]>(['tiktok', 'youtube', 'instagram']);
  const [types, setTypes] = useState<string[]>(['clipping']);
  const [category, setCategory] = useState<string>('Gaming');
  const [rules, setRules] = useState<string[]>(['Credit my channel on screen', 'Vertical 9:16 with captions']);
  const [rule, setRule] = useState('');
  const [refs, setRefs] = useState<Reference[]>([]);
  const [link, setLink] = useState('');
  const [uploading, setUploading] = useState(0);
  const [refError, setRefError] = useState('');

  const rate = Number(cpm) || 0;
  const prefix = (title.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6) || 'CLIP').padEnd(2, 'X');

  const addRule = () => {
    const t = rule.trim();
    if (t && rules.length < 12) setRules((r) => [...r, t.slice(0, 120)]);
    setRule('');
  };

  const addLink = () => {
    setRefError('');
    let url = link.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try {
      new URL(url);
    } catch {
      return setRefError('That doesn’t look like a link.');
    }
    if (refs.length >= REF_MAX) return setRefError(`Up to ${REF_MAX} references.`);
    setRefs((r) => [...r, { kind: 'link', url, name: linkName(url) }]);
    setLink('');
  };

  const upload = async (files: FileList | null) => {
    setRefError('');
    for (const f of Array.from(files ?? [])) {
      if (refs.length + uploading >= REF_MAX) return setRefError(`Up to ${REF_MAX} references.`);
      if (f.size > REF_MAX_BYTES) {
        setRefError(`${f.name} is over 50 MB. Put it on Drive or YouTube and add the link.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const res = await uploadUrl(f.name, f.size);
        if ('error' in res) throw new Error(res.error);
        const put = await fetch(res.uploadUrl, { method: 'PUT', body: f, headers: { 'content-type': f.type || 'application/octet-stream', 'x-upsert': 'false' } });
        if (!put.ok) throw new Error(`Upload of ${f.name} failed. Try again.`);
        setRefs((r) => [...r, { kind: kindOf(f.type), url: res.publicUrl, name: f.name.slice(0, 120) }]);
      } catch (e) {
        setRefError(e instanceof Error ? e.message : 'Upload failed.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const preview: MarketCampaign = {
    id: 'preview',
    brand_id: '',
    title: title.trim() || 'Your campaign title',
    payout_model: model,
    escrow_balance: 0,
    base_payout: Number(base) || 0,
    cpm_rate: rate,
    cpm_cap: Number(cap) || 0,
    cps_commission_pct: 0,
    code_prefix: '',
    pixel_id: null,
    asset_folder_url: null,
    status: 'draft',
    created_at: new Date().toISOString(),
    thumbnail_url: null,
    cover_color: '#0c0f0b',
    brief: null,
    requirements: [],
    platforms,
    content_types: types,
    category,
    brandName,
    creators: 0,
    budget: { deposited: 0, committed: 0, available: 0, usedShare: 0, daysLeft: null },
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        {/* Hidden fields the server expects. */}
        <input type="hidden" name="code_prefix" value={prefix} />
        <input type="hidden" name="cps_commission_pct" value="0" />
        <input type="hidden" name="payout_model" value={model} />
        <input type="hidden" name="requirements" value={rules.join('\n')} />
        <input type="hidden" name="reference_items" value={JSON.stringify(refs)} />
        {model !== 'per_post' && <input type="hidden" name="base_payout" value="0" />}
        {model !== 'pure_cpm' && <input type="hidden" name="cpm_rate" value="0" />}
        {model !== 'pure_cpm' && <input type="hidden" name="min_payout" value="0" />}
        {model === 'per_post' && <input type="hidden" name="cpm_cap" value={base || '0'} />}
        {model === 'pool' && <input type="hidden" name="cpm_cap" value="1000000" />}

        <Step n={1} title="The campaign" sub="A clear title gets more clippers.">
          <Field label="Title">
            <Input id="title" name="title" required minLength={3} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ranked Grind Highlights" />
          </Field>
          <fieldset className="mt-5">
            <legend className="mb-2 text-[13px] font-medium text-zinc-700">Category</legend>
            <input type="hidden" name="category" value={category} />
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm transition',
                    category === c ? 'border-transparent bg-brand font-medium text-brand-ink' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
        </Step>

        <Step n={2} title="How clippers get paid" sub="You approve every clip. Payouts after that are automatic.">
          <div role="radiogroup" aria-label="Payment model" className="grid grid-cols-3 gap-2 sm:gap-3">
            {MODELS.map((m) => {
              const on = model === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setModel(m.id)}
                  className={cn(
                    'relative rounded-2xl border p-3 text-left transition sm:p-4',
                    on ? 'border-brand-b/60 bg-brand-a/10 ring-4 ring-brand-a/10' : 'border-zinc-200 bg-white hover:border-zinc-300',
                  )}
                >
                  <span className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3">
                    <Tick on={on} />
                  </span>
                  <span className={cn('relative grid size-9 place-items-center overflow-hidden rounded-xl transition [&>svg]:relative [&>svg]:size-[18px]', on ? 'platform-tile bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-500')}>
                    <m.icon />
                  </span>
                  <span className="mt-3 block text-sm font-semibold tracking-tight sm:text-base">{m.title}</span>
                  <span className="mt-0.5 hidden text-xs leading-relaxed text-zinc-500 sm:block">{m.body}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-4 sm:p-5">
            {model === 'pure_cpm' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Rate per 1K views">
                    <Money id="cpm_rate" name="cpm_rate" min="0.01" required value={cpm} onChange={(e) => setCpm(e.target.value)} />
                  </Field>
                  <Field label="Min payout per clip">
                    <Money id="min_payout" name="min_payout" min="0" value={min} onChange={(e) => setMin(e.target.value)} />
                  </Field>
                  <Field label="Max payout per clip">
                    <Money id="cpm_cap" name="cpm_cap" min="1" required value={cap} onChange={(e) => setCap(e.target.value)} />
                  </Field>
                </div>
                {rate > 0 && (
                  <PayScale
                    rows={[
                      Number(min) > 0 ? ['Starts paying at', `${views((Number(min) / rate) * 1000)} views`, money(Number(min))] : ['Pays from', 'the first view', '$0'],
                      ['Example', '100K views', money(Math.min(100 * rate, Number(cap) || Infinity))],
                      ['Stops at', `${views(((Number(cap) || 0) / rate) * 1000)} views`, money(Number(cap) || 0)],
                    ]}
                  />
                )}
              </>
            )}
            {model === 'per_post' && (
              <>
                <Field label="Amount per approved clip" className="max-w-xs">
                  <Money id="base_payout" name="base_payout" min="1" required value={base} onChange={(e) => setBase(e.target.value)} />
                </Field>
                <PayScale rows={[['Each approved clip', 'any views', money(Number(base) || 0)], ['10 approved clips', '', money((Number(base) || 0) * 10)]]} />
              </>
            )}
            {model === 'pool' && (
              <>
                <p className="text-sm leading-relaxed text-zinc-600">
                  Everything you fund goes into one pool. When the campaign ends it’s split by views: a clip with 20% of the views gets 20% of the pool.
                </p>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-200">
                  {[45, 30, 15, 10].map((w, i) => (
                    <span key={i} className="h-full bg-brand" style={{ width: `${w}%`, opacity: 1 - i * 0.22 }} />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[10px] text-zinc-400">
                  <span>top clip 45%</span>
                  <span>…</span>
                </div>
              </>
            )}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
            <ShieldCheck className="size-3.5 text-[rgb(var(--brand-ta))]" /> Only views TikTok, YouTube and Instagram report count. Fake views are held.
          </p>
        </Step>

        <Step n={3} title="Where and what" sub="So the right clippers find you.">
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-zinc-700">Platforms</legend>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map(([value, label]) => {
                const on = platforms.includes(value);
                return (
                  <label
                    key={value}
                    className={cn(
                      'flex cursor-pointer flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center text-xs font-medium transition focus-within:ring-2 focus-within:ring-accent-500 sm:text-sm',
                      on ? 'border-brand-b/60 bg-brand-a/10 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300',
                    )}
                  >
                    <input type="checkbox" name="platforms" value={value} checked={on} onChange={() => setPlatforms((p) => (on ? p.filter((x) => x !== value) : [...p, value]))} className="sr-only" />
                    <span className={cn('relative grid size-9 place-items-center overflow-hidden rounded-xl transition', on ? 'platform-tile bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-400')}>
                      <PlatformIcon platform={value} className="relative size-[18px]" />
                    </span>
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="mt-5">
            <legend className="mb-2 text-[13px] font-medium text-zinc-700">Kind of videos</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CONTENT_TYPES.map(([id, label, hint]) => {
                const on = types.includes(id);
                return (
                  <label
                    key={id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition focus-within:ring-2 focus-within:ring-accent-500',
                      on ? 'border-brand-b/60 bg-brand-a/10' : 'border-zinc-200 bg-white hover:border-zinc-300',
                    )}
                  >
                    <input type="checkbox" name="content_types" value={id} checked={on} onChange={() => setTypes((t) => (on ? t.filter((x) => x !== id) : [...t, id]))} className="sr-only" />
                    <Tick on={on} />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-zinc-500">{hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Step>

        <Step n={4} title="Instructions" sub="What clippers should make, and the rules every clip follows.">
          <Field label="What you want">
            <textarea
              id="brief"
              name="brief"
              rows={4}
              maxLength={4000}
              className={textarea}
              placeholder="Cut the clutches, the rage and the comebacks from my ranked streams. Hook in the first second, keep it under 45 seconds."
            />
          </Field>
          <div className="mt-5">
            <p className="mb-2 text-[13px] font-medium text-zinc-700">Rules</p>
            <ul className="space-y-2">
              {rules.map((r, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-brand-ink">
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                  <span className="min-w-0 flex-1">{r}</span>
                  <button type="button" onClick={() => setRules((x) => x.filter((_, j) => j !== i))} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label={`Remove ${r}`}>
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            {rules.length < 12 && (
              <div className="mt-2 flex gap-2">
                <Input
                  value={rule}
                  maxLength={120}
                  onChange={(e) => setRule(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRule();
                    }
                  }}
                  placeholder="Add a rule, e.g. No swearing in the first 3 seconds"
                />
                <button type="button" onClick={addRule} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium transition hover:bg-zinc-50">
                  <Plus className="size-4" /> Add
                </button>
              </div>
            )}
            <p className="mt-2 text-xs text-zinc-500">Clippers tick these off before they submit. You check them when you approve.</p>
          </div>
        </Step>

        <Step n={5} title="References" sub="VODs, example clips, images, logos or anything that helps.">
          <Field label="VODs or source footage" hint="A Twitch, YouTube or Drive link clippers can cut from.">
            <Input id="asset_folder_url" name="asset_folder_url" type="url" placeholder="https://twitch.tv/you/videos" />
          </Field>
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex gap-2">
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLink();
                  }
                }}
                placeholder="Paste a link: an example clip, a sound, a doc"
              />
              <button type="button" onClick={addLink} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm font-medium transition hover:bg-zinc-50">
                <Link2 className="size-4" /> Add
              </button>
            </div>
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink transition hover:brightness-110 focus-within:ring-2 focus-within:ring-accent-500">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? 'Uploading…' : 'Upload files'}
              <input
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,.zip,.txt,.doc,.docx"
                className="sr-only"
                onChange={(e) => {
                  void upload(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Images, videos, PDFs or docs, up to 50 MB each and {REF_MAX} in total.</p>
          {refError && <p className="mt-2 text-sm text-rose-600">{refError}</p>}
          {refs.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {refs.map((r, i) => {
                const Icon = REF_ICON[r.kind];
                return (
                  <li key={r.url} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
                    <div className="grid aspect-video place-items-center bg-zinc-100">
                      {r.kind === 'image' ? (
                        <img src={r.url} alt="" className="size-full object-cover" />
                      ) : r.kind === 'video' ? (
                        <video src={r.url} muted playsInline preload="metadata" className="size-full object-cover" />
                      ) : (
                        <Icon className="size-6 text-zinc-400" />
                      )}
                    </div>
                    <p className="truncate px-2.5 py-2 text-xs font-medium">{r.name}</p>
                    <button
                      type="button"
                      onClick={() => setRefs((x) => x.filter((_, j) => j !== i))}
                      className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                      aria-label={`Remove ${r.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Step>

        {footer}
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Clippers will see</p>
        <div className="pointer-events-none">
          <MarketCard c={preview} href="#" />
        </div>
      </div>
    </div>
  );
}

/** A small table that turns the numbers into what they mean. */
function PayScale({ rows }: { rows: [string, string, string][] }) {
  return (
    <dl className="mt-4 divide-y divide-zinc-200/80 rounded-xl border border-zinc-200/80 bg-white text-sm">
      {rows.map(([a, b, c]) => (
        <div key={a} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <dt className="text-zinc-500">
            {a} {b && <span className="text-zinc-900">{b}</span>}
          </dt>
          <dd className="font-semibold tabular-nums">{c}</dd>
        </div>
      ))}
    </dl>
  );
}
