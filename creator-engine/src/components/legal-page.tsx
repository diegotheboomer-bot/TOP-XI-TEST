import Link from 'next/link';
import { SiteHeader } from './site-header';

/** Readable long-form layout for the privacy policy and terms. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="gutter mx-auto max-w-3xl py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: {updated}</p>
        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-zinc-700 [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-zinc-900 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
        <p className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
          <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Service</Link>
        </p>
      </main>
    </>
  );
}
