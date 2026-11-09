import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { RolePicker } from '@/components/role-picker';
import { isDemo } from '@/lib/env';

export default function StartPage() {
  // Demo: straight into each side. Real accounts sign in first, then pick (preselected).
  return (
    <>
      <SiteHeader />
      <RolePicker
        link={Link}
        streamerHref={isDemo ? '/streamer' : '/onboarding?role=brand'}
        clipperHref={isDemo ? '/clipper' : '/onboarding?role=creator'}
        assetBase="/demo/thumbs/"
      />
    </>
  );
}
