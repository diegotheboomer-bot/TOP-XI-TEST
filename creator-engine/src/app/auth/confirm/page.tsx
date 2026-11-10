import { Logo } from '@/components/site-header';
import { Card } from '@/components/ui/card';
import { ConfirmCard } from '@/components/forms/confirm-card';

export const dynamic = 'force-dynamic';

/** Email links land here (see supabase/email-templates and confirmHandoff). */
export default function ConfirmPage({ searchParams }: { searchParams: { token_hash?: string; type?: string; handoff?: string } }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-7">
          <ConfirmCard tokenHash={searchParams.token_hash ?? ''} type={searchParams.type ?? 'email'} handoff={searchParams.handoff ?? ''} />
        </Card>
      </div>
    </main>
  );
}
