'use client';

import { useCallback, useEffect, useState } from 'react';
import { testCashOut, testConnectSession, testDeposit, testStatus, type TestStatus } from '@/actions/test-money';
import type { ActionState } from '@/actions/result';
import { StripePayment } from './checkout/stripe-payment';
import { StripeOnboarding } from './payouts/stripe-onboarding';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/field';
import { FormMessage } from './form-message';

const money = (n: number) => `$${n.toFixed(2)}`;

export function TestMoney({ publishableKey }: { publishableKey: string }) {
  const [status, setStatus] = useState<TestStatus | { error: string }>();
  const [amount, setAmount] = useState('1');
  const [paid, setPaid] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [cash, setCash] = useState('0.50');
  const [cashState, setCashState] = useState<ActionState>();
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => setStatus(await testStatus()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const n = Number(amount);
  const quote = n >= 0.5 ? { amount: n, fee: 0, total: n, totalCents: Math.round(n * 100) } : null;
  const s = status && !('error' in status) ? status : null;

  return (
    <div className="space-y-4">
      {status && 'error' in status && <FormMessage state={{ error: status.error }} />}
      {s && (
        <Card className="grid grid-cols-3 gap-2 p-4 text-center">
          <Box k="Your Stripe balance" v={money(s.available)} hint={s.pending ? `${money(s.pending)} pending` : 'available'} />
          <Box k="Clipper bank" v={s.payoutsEnabled ? 'Connected' : 'Not yet'} />
          <Box k="Clipper received" v={money(s.clipperBalance)} />
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-semibold">1. Deposit</h2>
        <p className="mb-4 mt-1 text-sm text-zinc-500">
          Real card, real money. Stripe’s minimum is $0.50; try $1.
        </p>
        <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Amount" className="mb-4" />
        {paid ? (
          <p className="rounded-xl bg-brand-a/10 px-4 py-3 text-sm">
            Paid. <button className="underline" onClick={() => setPaid(false)}>Deposit again</button>
          </p>
        ) : (
          <StripePayment
            publishableKey={publishableKey}
            quote={quote}
            campaignId="test"
            createIntent={testDeposit}
            onPaid={() => {
              setPaid(true);
              void refresh();
            }}
          />
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">2. Connect a test bank</h2>
        <p className="mb-4 mt-1 text-sm text-zinc-500">
          Your real details and bank, through Stripe, exactly like a clipper would.
        </p>
        {onboarding ? (
          <StripeOnboarding
            publishableKey={publishableKey}
            createSession={testConnectSession}
            onExit={() => {
              setOnboarding(false);
              void refresh();
            }}
          />
        ) : (
          <Button variant="secondary" onClick={() => setOnboarding(true)}>
            {s?.payoutsEnabled ? 'Connected. Open again' : 'Connect test bank'}
          </Button>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold">3. Cash out</h2>
        <p className="mb-4 mt-1 text-sm text-zinc-500">Sends money from your deposit to the connected bank account. It lands in the bank in a few business days.</p>
        <div className="flex gap-2">
          <Input inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Cash-out amount" />
          <Button
            disabled={busy || !(Number(cash) > 0)}
            onClick={async () => {
              setBusy(true);
              setCashState(await testCashOut(Number(cash)));
              setBusy(false);
              void refresh();
            }}
          >
            {busy ? 'Sending…' : 'Cash out'}
          </Button>
        </div>
        <div className="mt-3">
          <FormMessage state={cashState} />
        </div>
      </Card>
    </div>
  );
}

function Box({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-zinc-500">{k}</p>
      <p className="truncate font-semibold tabular-nums">{v}</p>
      {hint && <p className="truncate text-[10px] text-zinc-400">{hint}</p>}
    </div>
  );
}
