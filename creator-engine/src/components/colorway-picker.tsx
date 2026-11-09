'use client';

import { useEffect, useState } from 'react';
import { Palette, X } from 'lucide-react';
import { cn } from './ui/cn';

// Same stops as tokens.css, so each swatch shows its own colorway.
const COLORWAYS = [
  { id: 'aqua', name: 'Aqua', a: '#22d3ee', b: '#34d399' },
  { id: 'electric', name: 'Electric', a: '#2563eb', b: '#4f46e5' },
  { id: 'mint', name: 'Mint', a: '#34d399', b: '#2dd4bf' },
  { id: 'volt', name: 'Volt', a: '#bef264', b: '#4ade80' },
  { id: 'violet', name: 'Violet', a: '#7c3aed', b: '#c026d3' },
  { id: 'sunset', name: 'Sunset', a: '#fb923c', b: '#f472b6' },
  { id: 'mono', name: 'Mono', a: '#a1a1aa', b: '#52525b' },
] as const;

const KEY = 'ce-colorway';
const DEFAULT = 'aqua';

/** Demo-only switcher for comparing colorways on the real screens. Remembered per browser. */
export function ColorwayPicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>(DEFAULT);

  useEffect(() => {
    setCurrent(document.documentElement.dataset.colorway ?? DEFAULT);
  }, []);

  function pick(id: string) {
    setCurrent(id);
    document.documentElement.dataset.colorway = id;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // storage blocked: the choice lasts for this visit
    }
  }

  return (
    <div className="colorway fixed bottom-0 right-0 z-40 flex flex-col items-end gap-2">
      {open && (
        <div role="dialog" aria-label="Colorway" className="w-60 rounded-xl border border-zinc-200 bg-white p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Colorway</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-7 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              <X className="size-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {COLORWAYS.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={current === c.id}
                  onClick={() => pick(c.id)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition', current === c.id ? 'bg-zinc-100 font-medium' : 'hover:bg-zinc-100')}
                >
                  <span className="size-5 shrink-0 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundImage: `linear-gradient(135deg, ${c.a}, ${c.b})` }} />
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 px-2 text-xs text-zinc-500">Preview only. Pick one and I’ll make it the default.</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-brand-ink shadow-lg transition hover:brightness-110"
      >
        <Palette className="size-4" /> Colorway
      </button>
    </div>
  );
}
