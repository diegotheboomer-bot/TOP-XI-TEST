'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CONNECT_CHANNEL = 'atlas-connect';

/**
 * A connect link that opens the provider's sign-in in a popup and keeps this page where it is.
 * Without JavaScript, or if the popup is blocked, it works as a normal link.
 */
export function PopupConnect({ href, className, style, children }: { href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    let ch: BroadcastChannel | undefined;
    try {
      ch = new BroadcastChannel(CONNECT_CHANNEL);
      ch.onmessage = (e: MessageEvent<{ to?: string }>) => {
        const to = e.data?.to;
        if (to?.startsWith('/') && !to.startsWith('//')) router.push(to);
        router.refresh();
      };
    } catch {}
    return () => ch?.close();
  }, [router]);
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={(e) => {
        const w = 520;
        const h = 720;
        const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
        const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
        const popup = window.open(`${href}${href.includes('?') ? '&' : '?'}popup=1`, 'atlas-connect', `width=${w},height=${h},left=${left},top=${top}`);
        if (popup) e.preventDefault();
      }}
    >
      {children}
    </a>
  );
}
