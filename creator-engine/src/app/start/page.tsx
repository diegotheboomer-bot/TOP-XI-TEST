import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { RolePicker } from '@/components/role-picker';
import { isDemo } from '@/lib/env';

export default function StartPage() {
  // Demo: straight into each side. Real accounts: sign up with that side preselected.
  return (
    <>
      <SiteHeader />
      <RolePicker
        link={Link}
        streamerHref={isDemo ? '/streamer' : '/signup?role=brand'}
        clipperHref={isDemo ? '/clipper' : '/signup?role=creator'}
        assetBase="/demo/thumbs/"
      />
    </>
  );
}
