import { BadgeCheck, Building2, Clock, HandCoins, HelpCircle } from 'lucide-react';

const STEPS = [
  { icon: BadgeCheck, title: 'Clip approved', body: 'The streamer approves your clip. It earns for every 1,000 verified views.' },
  { icon: Clock, title: 'Short hold', body: '3 days at Silver, down to 12 hours at Majesty. The streamer can still flag it in this time.' },
  { icon: HandCoins, title: 'You cash out', body: 'Tap Cash out on Earnings. All of it goes to your payout account, no fees.' },
  { icon: Building2, title: 'Lands in your bank', body: 'Stripe sends it to your IBAN or card automatically: usually 2–3 business days, up to 7 for your very first payout.' },
];

const FAQ: [string, string][] = [
  ['I cashed out. Where is the money?', 'It’s in your Stripe payout account, on its way to your bank. Use “Open Stripe dashboard” above to see the exact arrival date.'],
  ['Why does my first payout take longer?', 'Banks and Stripe check new accounts once. After the first payout, the next ones are faster.'],
  ['Why is the amount a little different?', 'There’s no Atlas fee. If your bank uses another currency, the exchange rate can change the amount a little.'],
  ['Do I need my own Stripe account?', 'No. The form above creates your payout account for you. You only add your details and bank once.'],
];

/** Explains where clip money goes, step by step, plus the questions clippers ask most. */
export function MoneyJourney() {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card sm:p-6">
      <h2 className="font-semibold tracking-tight">Where your money goes</h2>
      <ol className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex gap-3 sm:block">
            {i < STEPS.length - 1 && <span className="absolute left-[18px] top-10 hidden h-px w-[calc(100%-1rem)] bg-zinc-200 sm:block" aria-hidden />}
            <span className="platform-tile relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand text-brand-ink">
              <s.icon className="relative size-4" />
            </span>
            <div className="min-w-0">
            <p className="text-sm font-semibold sm:mt-3">
              <span className="mr-1.5 font-mono text-xs text-zinc-400">{i + 1}</span>
              {s.title}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 sm:mt-1">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-6 divide-y divide-zinc-100 border-t border-zinc-100">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <HelpCircle className="size-4 shrink-0 text-zinc-400" />
              <span className="flex-1">{q}</span>
              <span className="text-zinc-400 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 pl-6 text-sm leading-relaxed text-zinc-600">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
