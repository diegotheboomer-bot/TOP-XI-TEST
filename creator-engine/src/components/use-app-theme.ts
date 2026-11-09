'use client';

import { useEffect, useState } from 'react';

export type AppTheme = 'dark' | 'light';

/** The app's current theme (dark by default), following the theme toggle as it changes. */
export function useAppTheme(): AppTheme {
  const [theme, setTheme] = useState<AppTheme>('dark');
  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.appTheme === 'light' ? 'light' : 'dark');
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-app-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}
