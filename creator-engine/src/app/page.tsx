import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { Landing } from '@/components/landing';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <Landing link={Link} streamerHref="/streamer" clipperHref="/clipper/discover" assetBase="/demo/thumbs/" />
    </>
  );
}
