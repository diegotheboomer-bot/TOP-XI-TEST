'use client';

import { useEffect, useState } from 'react';
import { Check, Clapperboard, Eye, ImagePlus, PieChart, X } from 'lucide-react';
import { Field, Input, Select } from '../ui/field';
import { Card } from '../ui/card';
import { MarketCard } from '../views';
import { PlatformIcon } from '../platform-icon';
import { cn } from '../ui/cn';
import { THUMBNAIL_TYPES } from '@/lib/schemas';
import type { PayoutModel, Platform } from '@/lib/types';
import type { MarketCampaign } from '@/lib/data';
import { CATEGORIES, CONTENT_TYPES } from '@/lib/campaign-tags';

const MODELS: { id: PayoutModel; title: string; body: string; icon: React.ElementType }[] = [
  { id: 'pure_cpm', title: 'Per 1K views', body: 'Pay a rate for every 1,000 real views, up to a cap per clipper.', icon: Eye },
  { id: 'per_post', title: 'Per post', body: 'A flat amount for each approved clip, whatever its views.', icon: Clapperboard },
  { id: 'pool', title: 'Pool', body: 'One budget, split by each clipper’s share of the views.', icon: PieChart },
];

/** A small picture of each model on its card. */
function ModelArt({ id, on }: { id: PayoutModel; on: boolean }) {
  const bar = on ? 'bg-brand' : 'bg-zinc-200';
  if (id === 'pure_cpm') {
    return (
      <span className="mt-4 flex h-10 items-end gap-1" aria-hidden>
        {[3, 4, 3, 5, 6, 5, 7, 8, 10].map((h, i) => (
          <span key={i} className={cn('flex-1 rounded-sm transition', bar)} style={{ height: `${h * 10}%`, opacity: 0.4 + i * 0.07 }} />
        ))}
      </span>
    );
  }
  if (id === 'per_post') {
    return (
      <span className="mt-4 flex h-10 items-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn('flex h-full w-7 items-end justify-center rounded-md pb-1 font-mono text-[9px] font-semibold transition', on ? 'bg-brand text-brand-ink' : 'bg-zinc-200 text-zinc-500')}>
            $
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className="mt-4 flex h-10 items-center" aria-hidden>
      <span className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
        {[50, 30, 20].map((w, i) => (
          <span key={i} className={cn('h-full transition', bar)} style={{ width: `${w}%`, opacity: 1 - i * 0.3 }} />
        ))}
      </span>
    </span>
  );
}
const PLATFORMS: [Platform, string][] = [
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube Shorts'],
  ['instagram', 'Instagram Reels'],
];
export const COVER_COLORS = ['#0e2a47', '#16403a', '#2a1f4a', '#9a3412', '#4a2a1c', '#3d3320', '#7f1d1d', '#18181b'];
const DEFAULT_REQUIREMENTS = 'Credit my channel on screen';

const textarea =
  'w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/5';

/**
 * Fields for a new campaign plus a live preview of the Discover card.
 * The caller supplies the <form> and the submit row (`footer`).
 */
export function CampaignFormBody({ brandName, footer }: { brandName: string; footer: React.ReactNode }) {
  const [model, setModel] = useState<PayoutModel>('pure_cpm');
  const [title, setTitle] = useState('');
  const [base, setBase] = useState('20');
  const [cpm, setCpm] = useState('3');
  const [pct, setPct] = useState('10');
  const [cap, setCap] = useState('2500');
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [thumb, setThumb] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [platforms, setPlatforms] = useState<Platform[]>(['tiktok', 'youtube', 'instagram']);
  const [types, setTypes] = useState<string[]>(['clipping']);

  useEffect(() => () => void (thumb && URL.revokeObjectURL(thumb)), [thumb]);

  const preview: MarketCampaign = {
    id: 'preview',
    brand_id: '',
    title: title.trim() || 'Your campaign title',
    payout_model: model,
    escrow_balance: 0,
    base_payout: Number(base) || 0,
    cpm_rate: Number(cpm) || 0,
    cpm_cap: Number(cap) || 0,
    cps_commission_pct: Number(pct) || 0,
    code_prefix: '',
    pixel_id: null,
    asset_folder_url: null,
    status: 'draft',
    created_at: new Date().toISOString(),
    thumbnail_url: thumb,
    cover_color: color,
    brief: null,
    requirements: [],
    auto_approve_hours: 48,
    platforms,
    brandName,
    creators: 0,
    budget: { deposited: 0, committed: 0, available: 0, usedShare: 0, daysLeft: null },
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        <Card>
          <h2 className="mb-5 font-semibold tracking-tight">Basics</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Campaign title" className="sm:col-span-2">
              <Input id="title" name="title" required minLength={3} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ranked Grind Highlights" />
            </Field>
            <Field label="Brief" hint="What should creators make? Keep it short and specific." className="sm:col-span-2">
              <textarea id="brief" name="brief" rows={3} maxLength={4000} className={textarea} placeholder="Cut the clutches, the rage and the comebacks from my ranked streams. Vertical, captions on." />
            </Field>
            <Field label="Requirements" hint="One per line. Creators see these as a checklist." className="sm:col-span-2">
              <textarea id="requirements" name="requirements" rows={4} className={textarea} defaultValue={DEFAULT_REQUIREMENTS} />
            </Field>
            <Field label="VODs and source footage" hint="Link to your VODs or a Drive folder.">
              <Input id="asset_folder_url" name="asset_folder_url" type="url" placeholder="https://…" />
            </Field>
            <Field label="Merch code prefix" hint="Only used if you connect a merch store: each clipper gets it plus 4 characters as their discount code.">
              <Input id="code_prefix" name="code_prefix" required pattern="[A-Za-z0-9]{2,12}" placeholder="RANK" className="uppercase" />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold tracking-tight">How clippers get paid</h2>
          <p className="mb-5 text-sm text-zinc-500">Pick a payment model. You can run different models on different campaigns.</p>
          <input type="hidden" name="payout_model" value={model} />
          <div role="radiogroup" aria-label="Payment model" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                    'group relative overflow-hidden rounded-2xl border p-4 text-left transition',
                    on ? 'border-brand-b/60 bg-brand-a/10 ring-4 ring-brand-a/10' : 'border-zinc-200 bg-white hover:border-zinc-300',
                  )}
                >
                  <span className={cn('absolute right-3 top-3 grid size-5 place-items-center rounded-full transition', on ? 'bg-brand text-brand-ink' : 'border border-zinc-300')}>
                    {on && <Check className="size-3" strokeWidth={3.5} />}
                  </span>
                  <span className={cn('relative grid size-10 place-items-center overflow-hidden rounded-xl transition [&>svg]:relative [&>svg]:size-5', on ? 'platform-tile bg-brand text-brand-ink' : 'bg-zinc-100 text-zinc-500')}>
                    <m.icon />
                  </span>
                  <span className="mt-3 block font-semibold tracking-tight">{m.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{m.body}</span>
                  <ModelArt id={m.id} on={on} />
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {model === 'pure_cpm' && (
              <>
                <Field label="Rate per 1,000 views ($)">
                  <Input id="cpm_rate" name="cpm_rate" type="number" inputMode="decimal" min="0.01" step="0.01" value={cpm} onChange={(e) => setCpm(e.target.value)} />
                </Field>
                <Field label="Cap per clipper ($)" hint="The most one clipper can earn.">
                  <Input id="cpm_cap" name="cpm_cap" type="number" inputMode="decimal" min="1" step="0.01" required value={cap} onChange={(e) => setCap(e.target.value)} />
                </Field>
              </>
            )}
            {model === 'per_post' && (
              <>
                <Field label="Amount per clip ($)" hint="Paid for each approved clip, whatever its views.">
                  <Input id="base_payout" name="base_payout" type="number" inputMode="decimal" min="1" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} />
                </Field>
                <input type="hidden" name="cpm_cap" value={base || '0'} />
              </>
            )}
            {model === 'pool' && (
              <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-600 sm:col-span-2">
                Everything you fund goes into one pool. When the campaign ends, it’s split between clippers by their share of the views. A clip with 20% of
                the views gets 20% of the pool.
              </p>
            )}
            <Field label="Auto-approve after" hint="Clean clips are approved if you haven’t reviewed them by then.">
              <Select id="auto_approve_hours" name="auto_approve_hours" defaultValue="48">
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
                <option value="168">7 days</option>
              </Select>
            </Field>
          </div>
          <fieldset className="mt-5">
            <legend className="mb-2 text-[13px] font-medium text-zinc-700">Where clippers can post</legend>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(([value, label]) => {
                const on = platforms.includes(value);
                return (
                  <label
                    key={value}
                    className={cn(
                      'relative inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-accent-500',
                      on ? 'border-brand-b/60 bg-brand-a/10 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700',
                    )}
                  >
                    <input
                      type="checkbox"
                      name="platforms"
                      value={value}
                      checked={on}
                      onChange={() => setPlatforms((p) => (on ? p.filter((x) => x !== value) : [...p, value]))}
                      className="sr-only"
                    />
                    <PlatformIcon platform={value} className={cn('size-4 transition-colors', on ? 'text-[rgb(var(--brand-ta))]' : 'text-zinc-400')} />
                    {label}
                    <span className={cn('ml-1 grid size-4 place-items-center rounded-full transition', on ? 'bg-brand text-brand-ink' : 'border border-zinc-300')}>
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {/* Unused terms are sent as zero. */}
          {model !== 'per_post' && <input type="hidden" name="base_payout" value="0" />}
          {model !== 'pure_cpm' && <input type="hidden" name="cpm_rate" value="0" />}
          {model === 'pool' && <input type="hidden" name="cpm_cap" value="1000000" />}
          <input type="hidden" name="cps_commission_pct" value="0" />
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold tracking-tight">Type and category</h2>
          <p className="mb-5 text-sm text-zinc-500">So the right clippers find your campaign.</p>
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-zinc-700">What kind of videos</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CONTENT_TYPES.map(([id, label, hint]) => {
                const on = types.includes(id);
                return (
                  <label
                    key={id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition focus-within:ring-2 focus-within:ring-accent-500',
                      on ? 'border-brand-b/60 bg-brand-a/10' : 'border-zinc-200 bg-white hover:border-zinc-300',
                    )}
                  >
                    <input type="checkbox" name="content_types" value={id} checked={on} onChange={() => setTypes((t) => (on ? t.filter((x) => x !== id) : [...t, id]))} className="sr-only" />
                    <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full transition', on ? 'bg-brand text-brand-ink' : 'border border-zinc-300')}>
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-zinc-500">{hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <Field label="Category" className="mt-5 max-w-xs">
            <Select id="category" name="category" defaultValue="Gaming">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold tracking-tight">Thumbnail</h2>
          <p className="mb-5 text-sm text-zinc-500">A frame from your stream works well. 16:9, JPG, PNG or WebP up to 2 MB.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium transition hover:bg-zinc-50 focus-within:ring-2 focus-within:ring-accent-500">
              <ImagePlus className="size-4" />
              {thumb ? 'Change image' : 'Upload image'}
              <input
                key={fileKey}
                id="thumbnail"
                name="thumbnail"
                type="file"
                accept={THUMBNAIL_TYPES.join(',')}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setThumb(f ? URL.createObjectURL(f) : null);
                }}
              />
            </label>
            {thumb && (
              <button
                type="button"
                onClick={() => {
                  setThumb(null);
                  setFileKey((k) => k + 1);
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm text-zinc-600 hover:bg-zinc-100"
              >
                <X className="size-4" /> Remove
              </button>
            )}
          </div>
          <fieldset className={cn('mt-5', thumb && 'opacity-50')}>
            <legend className="mb-2 text-[13px] font-medium text-zinc-700">{thumb ? 'Cover colour (used if you remove the image)' : 'No image? Pick a cover colour'}</legend>
            <div className="flex flex-wrap gap-2">
              {COVER_COLORS.map((c) => (
                <label key={c} className="relative">
                  <input type="radio" name="cover_color" value={c} checked={color === c} onChange={() => setColor(c)} className="peer sr-only" />
                  <span
                    className="block size-8 cursor-pointer rounded-md ring-offset-2 ring-offset-white transition peer-checked:ring-2 peer-checked:ring-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </Card>
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
