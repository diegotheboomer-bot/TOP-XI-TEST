import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { Landing } from '@/components/landing';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <Landing link={Link} brandHref="/brand" creatorHref="/creator/discover" />
      <footer className="border-t border-zinc-200/70">
        <div className="gutter mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 py-6 text-sm text-zinc-500">
          <span>Creator Engine</span>
          <span>Supabase · Stripe Connect · TikTok API</span>
        </div>
      </footer>
    </>
  );
}
