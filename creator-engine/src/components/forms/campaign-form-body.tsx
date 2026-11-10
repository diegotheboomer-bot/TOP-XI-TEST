'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clapperboard, Dumbbell, Eye, FileText, Film, GalleryHorizontal, Gamepad2, GraduationCap, Image as ImageIcon, Laugh, Link2, ListChecks, Loader2, Play, MapPin, MessageCircle, Music, Paperclip, PieChart, Plus, Repeat2, Scissors, ShieldCheck, Sparkles, Trophy, Upload, Webcam, X } from 'lucide-react';
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

const TYPE_ICON: Record<string, React.ElementType> = { clipping: Scissors, facecam: Webcam, faceless: Gamepad2, meme: Laugh, slideshow: GalleryHorizontal, reposting: Repeat2 };
const CATEGORY_ICON: Record<string, React.ElementType> = {
  Gaming: Gamepad2,
  IRL: MapPin,
  'Just Chatting': MessageCircle,
  Esports: Trophy,
  Music: Music,
  Sports: Dumbbell,
  Comedy: Laugh,
  Education: GraduationCap,
  Other: Sparkles,
};

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
  const [asking, setAsking] = useState(true);
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
        {asking && (
          <ModelPopup
            onPick={(m) => {
              setModel(m);
              setAsking(false);
            }}
          />
        )}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <Field label="Title">
              <Input id="title" name="title" required minLength={3} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ranked Grind Highlights" />
            </Field>
            <Field label="Category">
              <CategoryPicker value={category} onChange={setCategory} />
            </Field>
          </div>
        </Step>

        <Step n={2} title="What and where" sub="So the right clippers find you.">
          <fieldset>
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
                    <span className={cn('relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl transition [&>svg]:relative [&>svg]:size-[18px]', on ? 'platform-tile bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-500')}>
                      {(() => {
                        const Icon = TYPE_ICON[id];
                        return <Icon />;
                      })()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-zinc-500">{hint}</span>
                    </span>
                    <Tick on={on} />
                  </label>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="mt-5">
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
        </Step>

        <Step n={3} title="Instructions" sub="What to make, the rules, and anything that helps.">
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
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-zinc-700"><ListChecks className="size-4 text-zinc-400" /> Rules</p>
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
          <div className="mt-6 border-t border-zinc-200/80 pt-5">
            <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-zinc-700">
              <Paperclip className="size-4 text-zinc-400" /> References <span className="font-normal text-zinc-400">· optional</span>
            </p>
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
          </div>
        </Step>

        <Step n={4} title="Pay clippers" sub="You approve every clip. Payouts after that are automatic.">
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

/** A dropdown of niches, each with its icon. */
function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const Icon = CATEGORY_ICON[value] ?? Sparkles;
  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="category" value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm transition hover:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-900/5"
      >
        <Icon className="size-4 text-[rgb(var(--brand-ta))]" />
        <span className="flex-1 text-left font-medium">{value}</span>
        <ChevronDown className={cn('size-4 text-zinc-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <ul role="listbox" className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
          {CATEGORIES.map((c) => {
            const I = CATEGORY_ICON[c] ?? Sparkles;
            const on = c === value;
            return (
              <li key={c}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition', on ? 'bg-brand-a/10 font-medium' : 'hover:bg-zinc-100')}
                >
                  <I className={cn('size-4', on ? 'text-[rgb(var(--brand-ta))]' : 'text-zinc-400')} />
                  <span className="flex-1">{c}</span>
                  {on && <Check className="size-4 text-[rgb(var(--brand-ta))]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const PITCH: Record<string, { tag: string; best: string }> = {
  pure_cpm: { tag: 'e.g. $3 per 1K views', best: 'Best for reach: you only pay for real views' },
  per_post: { tag: 'e.g. $20 per clip', best: 'Best for volume: lots of clips, fast' },
  pool: { tag: 'e.g. $1,000 split', best: 'Best for a fixed budget: clippers compete' },
};

const INK = 'rgb(26 46 5)';
const LIME = '#d9f99d';

/** A dark 9:16 clip with a play button, the shape clippers post. */
function MiniClip({ className, style, children }: { className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <span className={cn('absolute grid aspect-[9/16] place-items-center rounded-[5px] shadow-md', className)} style={{ backgroundColor: INK, ...style }}>
      <Play className="size-2.5 fill-current" style={{ color: LIME }} />
      {children}
    </span>
  );
}

/** A small moving picture of each pay type: a clip and what it earns. */
function ModelViz({ id }: { id: PayoutModel }) {
  if (id === 'pure_cpm') {
    // A clip whose views tick up, with dollars following.
    return (
      <span className="relative block h-full" aria-hidden>
        <MiniClip className="left-[12%] top-[12%] h-[76%]" />
        <span className="viz-float absolute right-[8%] top-[16%] flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold shadow" style={{ backgroundColor: INK, color: LIME }}>
          <Eye className="size-2.5" /> 1K
        </span>
        <span className="viz-float absolute bottom-[16%] right-[8%] rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold shadow" style={{ color: INK, backgroundColor: '#fff', animationDelay: '0.5s' }}>
          +$3
        </span>
      </span>
    );
  }
  if (id === 'per_post') {
    // Approved clips, each with a fixed price tag.
    return (
      <span className="relative block h-full" aria-hidden>
        {[0, 1, 2].map((i) => (
          <MiniClip
            key={i}
            className="top-[8%] h-[62%] ring-1 ring-[#d9f99d]/40"
            style={{ left: `${50 + (i - 1) * 22}%`, translate: '-50% 0', rotate: `${(i - 1) * 12}deg`, transformOrigin: 'bottom center', zIndex: i === 1 ? 3 : i }}
          >
            <span className="absolute -right-1 -top-1 grid size-3 place-items-center rounded-full" style={{ color: INK, backgroundColor: LIME }}>
              <Check className="size-2" strokeWidth={4} />
            </span>
          </MiniClip>
        ))}
        <span className="absolute bottom-[6%] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold shadow" style={{ color: INK, backgroundColor: '#fff' }}>
          $20 each
        </span>
      </span>
    );
  }
  // One pot of money, split between clippers by their views.
  return (
    <span className="flex h-full flex-col items-center justify-center gap-1.5 px-2.5" aria-hidden>
      <span className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold shadow" style={{ backgroundColor: INK, color: LIME }}>
        $1,000
      </span>
      <span className="flex w-full items-end gap-[3px]">
        {[
          [45, 'A'],
          [33, 'B'],
          [22, 'C'],
        ].map(([w, l], i) => (
          <span key={l} className="flex flex-col items-center gap-0.5" style={{ width: `${w}%` }}>
            <span className="grid size-3.5 place-items-center rounded-full text-[7px] font-bold" style={{ color: INK, backgroundColor: '#fff' }}>
              {l}
            </span>
            <span className="viz-bar h-2 w-full rounded-[3px]" style={{ backgroundColor: INK, opacity: 1 - i * 0.25, animationDelay: `${i * 0.15}s` }} />
          </span>
        ))}
      </span>
    </span>
  );
}

/** The first thing a streamer sees: one tap to choose how clippers are paid. */
function ModelPopup({ onPick }: { onPick: (m: PayoutModel) => void }) {
  const [picked, setPicked] = useState<PayoutModel | null>(null);
  const pick = (m: PayoutModel) => {
    if (picked) return;
    setPicked(m);
    setTimeout(() => onPick(m), 420);
  };
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => void (document.body.style.overflow = prev);
  }, []);
  return (
    <div className={cn('sheet-backdrop fixed inset-0 z-50 grid place-items-end bg-black/70 backdrop-blur-md sm:place-items-center sm:p-4', picked && 'sheet-out')} role="dialog" aria-modal aria-labelledby="model-q">
      <div className="sheet-up relative w-full max-w-lg overflow-hidden rounded-t-[28px] border border-zinc-200 bg-white shadow-2xl sm:rounded-[28px]">
        {/* Volt glow behind the heading. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48"
          style={{ background: 'radial-gradient(70% 100% at 20% 0%, rgb(var(--brand-a) / 0.28), transparent 70%), radial-gradient(60% 90% at 90% 0%, rgb(var(--brand-b) / 0.22), transparent 70%)' }}
        />
        <div className="relative px-5 pb-6 pt-3 sm:px-7 sm:pb-7 sm:pt-7">
          <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-zinc-300 sm:hidden" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-b/40 bg-brand-a/10 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
            <Sparkles className="size-3.5 text-[rgb(var(--brand-ta))]" /> New campaign
          </span>
          <h2 id="model-q" className="balance mt-3 text-2xl font-semibold leading-tight tracking-tight sm:text-[28px]">
            How do you want to <span className="text-brand">pay clippers?</span>
          </h2>
          <p className="mt-1.5 text-sm text-zinc-500">Pick one to start. You can switch any time before you launch.</p>

          <div className="mt-6 space-y-2.5">
            {MODELS.map((m, i) => {
              const on = picked === m.id;
              const rec = m.id === 'pure_cpm';
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pick(m.id)}
                  style={{ animationDelay: `${0.12 + i * 0.07}s` }}
                  className={cn(
                    'sheet-item group flex w-full items-center gap-4 rounded-2xl border bg-white p-3 text-left transition duration-200 active:scale-[0.98]',
                    rec ? 'glow-border border-transparent' : 'border-zinc-200 hover:border-zinc-300',
                    on ? 'bg-brand-a/15 ring-4 ring-brand-a/20' : 'hover:-translate-y-0.5 hover:shadow-card',
                    picked && !on && 'opacity-40',
                  )}
                >
                  <span className="platform-tile relative h-[72px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-brand">
                    <ModelViz id={m.id} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="flex items-center gap-1.5 font-semibold tracking-tight">
                        <m.icon className="size-4 text-[rgb(var(--brand-ta))]" />
                        {m.title}
                      </span>
                      {rec && <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-ink">Recommended</span>}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-zinc-600">{PITCH[m.id].best}</span>
                    <span className="mt-1.5 inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 font-mono text-[10.5px] text-zinc-500">{PITCH[m.id].tag}</span>
                  </span>
                  <span className={cn('grid size-7 shrink-0 place-items-center rounded-full transition', on ? 'pick-pop bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-400 group-hover:bg-brand group-hover:text-brand-ink')}>
                    {on ? <Check className="size-4" strokeWidth={3} /> : <ChevronDown className="size-4 -rotate-90" />}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <ShieldCheck className="size-3.5 text-[rgb(var(--brand-ta))]" /> You approve every clip. Only real views count.
          </p>
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
