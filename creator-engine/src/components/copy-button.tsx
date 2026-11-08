'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-xs font-medium text-zinc-500">{label}</div>
      <div className="flex items-center gap-2 rounded-xl bg-zinc-50 py-1.5 pl-3.5 pr-1.5 ring-1 ring-inset ring-zinc-200/80">
        <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-800">{value}</code>
        <button
          type="button"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-white hover:text-zinc-900"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
