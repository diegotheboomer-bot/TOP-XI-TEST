'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Field, Input, Select } from '../ui/field';
import { Card } from '../ui/card';
import { MarketCard } from '../views';
import { cn } from '../ui/cn';
import { THUMBNAIL_TYPES } from '@/lib/schemas';
import type { PayoutModel } from '@/lib/types';
import type { MarketCampaign } from '@/lib/data';

const HELP: Record<PayoutModel, string> = {
  hybrid: 'A guaranteed base fee plus a rate on verified views.',
  pure_cpm: 'Creators earn only on verified views.',
  cps_performance: 'Creators earn a commission on sales from their code or link.',
};
export const COVER_COLORS = ['#0e2a47', '#16403a', '#2a1f4a', '#9a3412', '#4a2a1c', '#3d3320', '#7f1d1d', '#18181b'];
const DEFAULT_REQUIREMENTS = 'Post natively on TikTok (no reuploads)\nInclude #ad in the caption';

const textarea =
  'w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/5';

/**
 * Fields for a new campaign plus a live preview of the Discover card.
 * The caller supplies the <form> and the submit row (`footer`).
 */
export function CampaignFormBody({ brandName, footer }: { brandName: string; footer: React.ReactNode }) {
  const [model, setModel] = useState<PayoutModel>('hybrid');
  const [title, setTitle] = useState('');
  const [base, setBase] = useState('200');
  const [cpm, setCpm] = useState('3');
  const [pct, setPct] = useState('10');
  const [cap, setCap] = useState('2500');
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [thumb, setThumb] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);

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
              <Input id="title" name="title" required minLength={3} maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Speedrun Sunday" />
            </Field>
            <Field label="Brief" hint="What should creators make? Keep it short and specific." className="sm:col-span-2">
              <textarea id="brief" name="brief" rows={3} maxLength={4000} className={textarea} placeholder="Show your real reaction to the first sip, mid-stream. Keep it unscripted." />
            </Field>
            <Field label="Requirements" hint="One per line. Creators see these as a checklist." className="sm:col-span-2">
              <textarea id="requirements" name="requirements" rows={4} className={textarea} defaultValue={DEFAULT_REQUIREMENTS} />
            </Field>
            <Field label="Raw footage or brand assets" hint="Optional link to a Drive or S3 folder.">
              <Input id="asset_folder_url" name="asset_folder_url" type="url" placeholder="https://…" />
            </Field>
            <Field label="Discount code prefix" hint="Each creator gets the prefix plus 4 characters.">
              <Input id="code_prefix" name="code_prefix" required pattern="[A-Za-z0-9]{2,12}" placeholder="RUN" className="uppercase" />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="mb-5 font-semibold tracking-tight">Payout</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Payout model" hint={HELP[model]} className="sm:col-span-2">
              <Select id="payout_model" name="payout_model" value={model} onChange={(e) => setModel(e.target.value as PayoutModel)}>
                <option value="hybrid">Hybrid: base fee plus views</option>
                <option value="pure_cpm">Views only</option>
                <option value="cps_performance">Sales commission</option>
              </Select>
            </Field>
            {model === 'hybrid' && (
              <Field label="Base fee ($)" hint="Paid once the video is approved.">
                <Input id="base_payout" name="base_payout" type="number" inputMode="decimal" min="0" step="0.01" value={base} onChange={(e) => setBase(e.target.value)} />
              </Field>
            )}
            {model !== 'cps_performance' && (
              <Field label="Rate per 1,000 views ($)">
                <Input id="cpm_rate" name="cpm_rate" type="number" inputMode="decimal" min="0" step="0.01" value={cpm} onChange={(e) => setCpm(e.target.value)} />
              </Field>
            )}
            {model === 'cps_performance' && (
              <Field label="Commission per sale (%)">
                <Input id="cps_commission_pct" name="cps_commission_pct" type="number" inputMode="decimal" min="0" max="100" step="0.1" value={pct} onChange={(e) => setPct(e.target.value)} />
              </Field>
            )}
            <Field label="Cap per creator ($)" hint="The most one creator can earn.">
              <Input id="cpm_cap" name="cpm_cap" type="number" inputMode="decimal" min="1" step="0.01" required value={cap} onChange={(e) => setCap(e.target.value)} />
            </Field>
            <Field label="Auto-approve after" hint="Clean videos with #ad are approved if you haven’t reviewed them by then.">
              <Select id="auto_approve_hours" name="auto_approve_hours" defaultValue="48">
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
                <option value="168">7 days</option>
              </Select>
            </Field>
          </div>
          {/* Unused terms are sent as zero. */}
          {model !== 'hybrid' && <input type="hidden" name="base_payout" value="0" />}
          {model === 'cps_performance' && <input type="hidden" name="cpm_rate" value="0" />}
          {model !== 'cps_performance' && <input type="hidden" name="cps_commission_pct" value="0" />}
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold tracking-tight">Thumbnail</h2>
          <p className="mb-5 text-sm text-zinc-500">Shown on the campaign card. 16:9 works best. JPG, PNG or WebP up to 2 MB.</p>
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
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">Creators will see</p>
        <div className="pointer-events-none">
          <MarketCard c={preview} href="#" />
        </div>
      </div>
    </div>
  );
}
