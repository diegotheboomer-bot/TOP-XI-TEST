'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { cn } from '../ui/cn';

const MESSAGE = 'I clip on Atlas and get paid per view. Join with my link:';

/** The invite link with a big Copy button and the phone's share sheet where there is one. */
export function ShareLink({ link, className, message = MESSAGE }: { link: string; className?: string; message?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(link).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => window.prompt('Copy your link', link),
    );
  const share = () => {
    if (navigator.share) navigator.share({ title: 'Atlas Clips', text: message, url: link }).catch(() => {});
    else copy();
  };
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row', className)}>
      <button type="button" onClick={copy} className="flex h-12 min-w-0 shrink-0 items-center gap-2 rounded-xl sm:flex-1 bg-zinc-100/70 px-4 text-left ring-1 ring-inset ring-zinc-200/60 transition hover:bg-zinc-100">
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-700">{link.replace(/^https?:\/\//, '')}</span>
        <span className={cn('inline-flex shrink-0 items-center gap-1 text-sm font-semibold', copied ? 'text-[rgb(var(--brand-ta))]' : 'text-zinc-500')}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy'}
        </span>
      </button>
      <button type="button" onClick={share} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-ink shadow-[0_10px_30px_-12px_rgb(var(--brand-b)/0.8)] transition hover:brightness-110 active:scale-[0.98]">
        <Share2 className="size-4" /> Share my link
      </button>
    </div>
  );
}
