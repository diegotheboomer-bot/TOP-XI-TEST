'use client';

// Instructions, rules, moments switch and references: shared by the create and edit campaign forms.
import { useState } from 'react';
import { Check, FileText, Film, Image as ImageIcon, Link2, ListChecks, Loader2, MapPin, Paperclip, Plus, Upload, X } from 'lucide-react';
import { Field, Input } from '../ui/field';
import { cn } from '../ui/cn';
import { REF_MAX, REF_MAX_BYTES, kindOf, linkName, type Reference } from '@/lib/references';

export type UploadUrl = (name: string, size: number) => Promise<{ error: string } | { uploadUrl: string; publicUrl: string }>;

const REF_ICON = { link: Link2, image: ImageIcon, video: Film, file: FileText } as const;
const textarea =
  'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 transition focus:border-zinc-400 focus:outline-none focus:ring-4 focus:ring-zinc-900/5';

export function InstructionsFields({
  uploadUrl,
  brief = '',
  initialRules = ['Credit my channel on screen', 'Vertical 9:16 with captions'],
  initialRefs = [],
  assetFolderUrl = '',
  momentsEnabled = false,
}: {
  uploadUrl: UploadUrl;
  brief?: string;
  initialRules?: string[];
  initialRefs?: Reference[];
  assetFolderUrl?: string;
  momentsEnabled?: boolean;
}) {
  const [rules, setRules] = useState<string[]>(initialRules);
  const [rule, setRule] = useState('');
  const [refs, setRefs] = useState<Reference[]>(initialRefs);
  const [link, setLink] = useState('');
  const [uploading, setUploading] = useState(0);
  const [refError, setRefError] = useState('');
  const [moments, setMoments] = useState(momentsEnabled);

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

  return (
    <>
      <input type="hidden" name="requirements" value={rules.join('\n')} />
      <input type="hidden" name="reference_items" value={JSON.stringify(refs)} />
      <input type="hidden" name="moments_enabled" value={moments ? 'true' : 'false'} />
          <Field label="What you want">
            <textarea
              id="brief"
              name="brief"
              defaultValue={brief}
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
          <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3.5">
            <MapPin className="size-4 shrink-0 text-zinc-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Pin stream moments</span>
              <span className="block text-xs text-zinc-500">Post timestamps for clippers to claim, so they don’t all cut the same thing.</span>
            </span>
            <input type="checkbox" checked={moments} onChange={(e) => setMoments(e.target.checked)} className="peer sr-only" />
            <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition', moments ? 'bg-brand' : 'bg-zinc-200')}>
              <span className={cn('absolute top-0.5 size-5 rounded-full shadow transition-all', moments ? 'left-[22px]' : 'left-0.5')} style={{ backgroundColor: '#fff' }} />
            </span>
          </label>
          <div className="mt-6 border-t border-zinc-200/80 pt-5">
            <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium text-zinc-700">
              <Paperclip className="size-4 text-zinc-400" /> References <span className="font-normal text-zinc-400">· optional</span>
            </p>
          <Field label="VODs or source footage" hint="A Twitch, YouTube or Drive link clippers can cut from.">
            <Input id="asset_folder_url" name="asset_folder_url" type="url" defaultValue={assetFolderUrl} placeholder="https://twitch.tv/you/videos" />
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
    </>
  );
}
