import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { Landing } from '@/components/landing';
import { platformFeePercent } from '@/lib/stripe';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <Landing link={Link} startHref="/start" clipperHref="/clipper/discover" feePercent={platformFeePercent()} legal={{ privacy: '/privacy', terms: '/terms' }} />
    </>
  );
}
