'use client';

import { useEffect, useState } from 'react';
import { Shapes, X } from 'lucide-react';
import { LOGO_MARKS, LogoMark } from './logo';
import { cn } from './ui/cn';

const KEY = 'ce-logo';

/** Demo-only switcher for comparing logo marks in the real header and sidebar. Remembered per browser. */
export function LogoPicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>('cut');

  useEffect(() => {
    setCurrent(document.documentElement.dataset.logo ?? 'cut');
  }, []);

  function pick(id: string) {
    setCurrent(id);
    document.documentElement.dataset.logo = id;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // storage blocked: the choice lasts for this visit
    }
  }

  return (
    <div className="picker fixed bottom-0 right-0 z-40 flex flex-col items-end gap-2">
      {open && (
        <div role="dialog" aria-label="Logo options" className="w-64 rounded-xl border border-zinc-200 bg-white p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Logo options</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-7 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              <X className="size-4" />
            </button>
          </div>
          <ul className="space-y-1">
            {LOGO_MARKS.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={current === m.id}
                  onClick={() => pick(m.id)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition', current === m.id ? 'bg-zinc-100 font-medium' : 'hover:bg-zinc-100')}
                >
                  <LogoMark mark={m.id} className="size-7 text-zinc-900" />
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 px-2 text-xs text-zinc-500">Preview only. Pick one and I’ll make it the logo.</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-sm font-medium text-brand-ink shadow-lg transition hover:brightness-110"
      >
        <Shapes className="size-4" /> Logo
      </button>
    </div>
  );
}
