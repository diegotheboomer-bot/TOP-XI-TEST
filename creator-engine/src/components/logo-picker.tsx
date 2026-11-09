'use client';

import { useEffect, useState } from 'react';
import { Shapes, X } from 'lucide-react';
import { LOGO_MARKS, LogoMark } from './logo';
import { cn } from './ui/cn';

const KEY = 'ce-logo';

/** Demo-only switcher for comparing logo marks in the real header and sidebar. Remembered per browser. */
export function LogoPicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string>('ccut');

  useEffect(() => {
    setCurrent(document.documentElement.dataset.logo ?? 'ccut');
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
        <div role="dialog" aria-label="Logo options" className="max-h-[70dvh] w-[19rem] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Logo options</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-7 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
              <X className="size-4" />
            </button>
          </div>
          <ul className="grid grid-cols-4 gap-1">
            {LOGO_MARKS.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={current === m.id}
                  title={m.meaning}
                  onClick={() => pick(m.id)}
                  className={cn('flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition', current === m.id ? 'bg-zinc-100 ring-1 ring-brand-a' : 'hover:bg-zinc-100')}
                >
                  <LogoMark mark={m.id} className="size-10" />
                  <span className="text-[10px] leading-tight text-zinc-600">
                    {i + 1}. {m.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 px-1 text-xs text-zinc-500">{LOGO_MARKS.find((m) => m.id === current)?.meaning}. Pick one and I’ll make it the logo.</p>
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
