'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from './ui/cn';

type Theme = 'dark' | 'light';

/** Dark by default; switches to light and remembers the choice in this browser. */
export function ThemeToggle({ className, labelled = true, labelClassName }: { className?: string; labelled?: boolean; labelClassName?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => setTheme(document.documentElement.dataset.appTheme === 'light' ? 'light' : 'dark'), []);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      aria-label={`Switch to ${next} mode`}
      onClick={() => {
        if (next === 'light') document.documentElement.dataset.appTheme = 'light';
        else delete document.documentElement.dataset.appTheme;
        try {
          localStorage.setItem('ce-theme', next);
        } catch {
          // storage blocked: the choice lasts for this visit
        }
        setTheme(next);
      }}
      className={cn(
        'flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 [&>svg]:size-4',
        className,
      )}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
      {labelled && <span className={labelClassName}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
