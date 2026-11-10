// Plain questions and answers: shown on the landing page, and the same list is
// published as FAQPage structured data so search engines and AI assistants can quote it.
export const FAQ: [string, string][] = [
  [
    'How do I make money clipping streams?',
    'Sign up as a clipper, join a streamer’s campaign and post short clips of their streams to TikTok, YouTube Shorts or Instagram Reels from your own account. You earn a set amount for every 1,000 real views, paid automatically.',
  ],
  [
    'Is clipping passive income?',
    'Not fully: you make and post the clips. But once a clip is up, it keeps earning as it gets views, with no extra work, until the campaign’s cap or budget is reached. Many clippers do it as a side income.',
  ],
  [
    'How much can I earn?',
    'Each campaign shows its rate before you join, for example $2 per 1,000 views, and a cap per clipper. A clip with 100,000 views at $2 per 1,000 earns $200. Earnings depend on the views your clips get.',
  ],
  [
    'Do I need followers?',
    'No. There’s no follower minimum. You’re paid on the views your clips get, checked on TikTok, YouTube and Instagram. Fake or bought views aren’t paid.',
  ],
  [
    'How do I get paid, and are there fees?',
    'Approved clips are paid automatically 3 days after approval to your bank or debit card, PayPal or Venmo. Clippers pay no fees and keep 100% of what they earn.',
  ],
  [
    'What do streamers get?',
    'Streamers fund a campaign, pin the moments worth clipping and only pay for real views on clips posted across TikTok, Shorts and Reels, plus a flat service fee (which covers card processing) shown before paying.',
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
