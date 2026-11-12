// Plain questions and answers: shown on the landing page, and the same list is
// published as FAQPage structured data so search engines and AI assistants can quote it.
export const FAQ: [string, string][] = [
  [
    'How do I make money clipping streams?',
    'Sign up as a clipper, join a campaign and post short clips of the content (streams, music, trailers, videos) to TikTok, YouTube Shorts or Instagram Reels from your own account. You earn for every 1,000 real views.',
  ],
  [
    'Is clipping passive income?',
    'Not fully: you make and post the clips. But once a clip is up, it keeps earning as it gets views, with no extra work, until the campaign’s cap or budget is reached. Many clippers do it as a side income.',
  ],
  [
    'How much can I earn?',
    'Each campaign shows its rate before you join, for example $1 per 1,000 views, and a cap per clip. A clip with 100,000 views at $1 per 1,000 earns $100. Earnings depend on the views your clips get.',
  ],
  [
    'Do I need followers?',
    'No. There’s no follower minimum. You’re paid on the views your clips get, checked on TikTok, YouTube and Instagram. Fake or bought views aren’t paid.',
  ],
  [
    'How do I get paid, and are there fees?',
    'Once a clip is approved and its short hold has passed, you can cash out to your bank account (or a debit card in countries where Stripe supports it, like the US). A flat 2% fee comes off each cash-out, nothing else. Invite other clippers and their 2% goes to you for their first 90 days. As you grow through Gold, Diamond and Majesty, you get paid sooner and can cash out more often.',
  ],
  [
    'What do campaign owners get?',
    'Streamers, brands, musicians and studios fund a campaign, share their content and rules, approve every clip and only pay for real views across TikTok, Shorts and Reels, plus Stripe’s card processing, shown before paying. There’s currently no service fee.',
  ],
];

export function Faq() {
  return (
    <section className="border-t border-zinc-200/80 py-16">
      <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">Questions</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Good to know</h2>
      <div className="mt-8 divide-y divide-zinc-200/80 rounded-2xl border border-zinc-200/80 bg-white">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-5 py-4 sm:px-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {q}
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
