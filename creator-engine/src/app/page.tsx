import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { Landing } from '@/components/landing';
import { noServiceFee, platformFeePercent } from '@/lib/stripe';
import { FAQ } from '@/components/faq';

// Structured data: what Atlas is, and the FAQ, in a form search engines and AI assistants read.
const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Atlas Clipping',
    alternateName: 'Atlas Clips',
    url: 'https://atlasclipping.com',
    logo: 'https://atlasclipping.com/brand/app-icon-1024.png',
    description: 'Clipping marketplace: streamers fund campaigns, clippers get paid per 1,000 real views on TikTok, YouTube Shorts and Instagram Reels.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
];

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader />
      <Landing link={Link} startHref="/start" clipperHref="/clipper/discover" clipperStartHref="/signup?role=creator" feePercent={noServiceFee() ? 0 : platformFeePercent()} legal={{ privacy: '/privacy', terms: '/terms' }} />
    </>
  );
}
