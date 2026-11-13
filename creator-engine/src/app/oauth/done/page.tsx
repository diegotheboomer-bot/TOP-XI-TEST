'use client';

import { useEffect } from 'react';

const CONNECT_CHANNEL = 'atlas-connect';

/** End of a popup sign-in: tell the page that opened it where to go, then close. */
export default function OAuthDone({ searchParams }: { searchParams: { to?: string } }) {
  const raw = searchParams.to ?? '/';
  // Only paths on this site.
  const to = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
  useEffect(() => {
    try {
      const ch = new BroadcastChannel(CONNECT_CHANNEL);
      ch.postMessage({ to });
      ch.close();
    } catch {}
    window.close();
    // Not a popup after all (or the browser kept it open): carry on here.
    const t = setTimeout(() => window.location.replace(to), 400);
    return () => clearTimeout(t);
  }, [to]);
  return <p className="p-8 text-center text-sm text-zinc-500">Connected. You can close this window.</p>;
}
