import { BadgeCheck, Banknote, Clock, ShieldCheck } from 'lucide-react';
import { Card } from '../ui/card';

/** /clipper/payouts, shared by the app and the standalone demo. */
export function PayoutsView({ enabled, form, manage }: { enabled: boolean; form: React.ReactNode; manage?: React.ReactNode }) {
  if (enabled) {
    return (
      <Card className="max-w-xl">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700">
            <BadgeCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Payouts are on</h2>
            <p className="mt-1 text-sm text-zinc-500">
              When a streamer pays you, the money goes to your Stripe balance and then to your bank on Stripe’s payout schedule. You keep 100%.
            </p>
          </div>
        </div>
        {manage && <div className="mt-5 border-t border-zinc-100 pt-5">{manage}</div>}
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
      <Card className="min-w-0">{form}</Card>
      <Card className="space-y-4 text-sm">
        <Point icon={<Clock />} title="About 5 minutes" body="Name, date of birth, address and the last 4 digits of your SSN." />
        <Point icon={<Banknote />} title="Where money lands" body="A bank account or debit card in your name." />
        <Point icon={<ShieldCheck />} title="Checked by Stripe" body="Stripe verifies your identity and stores your details. We never see your full SSN or bank number." />
      </Card>
    </div>
  );
}

function Point({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-zinc-400 [&>svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-zinc-500">{body}</p>
      </div>
    </div>
  );
}
