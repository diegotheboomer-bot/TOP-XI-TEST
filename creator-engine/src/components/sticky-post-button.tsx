'use client';

import { useEffect, useState } from 'react';

/** Phones: keeps the main action in reach, and steps aside once the target box is on screen. */
export function StickyAction({ target, children }: { target: string; children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return (
    <div
      className={`fixed inset-x-0 z-20 px-4 transition duration-300 lg:hidden ${hidden ? 'pointer-events-none translate-y-4 opacity-0' : ''}`}
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
    >
      {children}
    </div>
  );
}
