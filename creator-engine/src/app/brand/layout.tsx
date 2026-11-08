import { SiteHeader } from '@/components/site-header';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">{children}</main>
    </>
  );
}
