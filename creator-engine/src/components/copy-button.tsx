'use client';

import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-xs font-medium text-zinc-500">{label}</div>
      <div className="flex items-center gap-2 rounded-lg bg-zinc-50 py-1.5 pl-3 pr-1.5 ring-1 ring-inset ring-zinc-200/80">
        <code ref={codeRef} className="min-w-0 flex-1 select-all truncate font-mono text-[13px] text-zinc-800">{value}</code>
        <button
          type="button"
          aria-label={`Copy ${label}`}
          onClick={() => {
            navigator.clipboard
              .writeText(value)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch(() => {
                // Clipboard refused (some embedded views): select the text so it can be copied by hand.
                const el = codeRef.current;
                const sel = window.getSelection();
                if (!el || !sel) return;
                const range = document.createRange();
                range.selectNodeContents(el);
                sel.removeAllRanges();
                sel.addRange(range);
              });
          }}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-white hover:text-zinc-900"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}
