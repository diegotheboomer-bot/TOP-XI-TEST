# Atlas Clipping — handoff for AI coding agents (Codex, Claude Code)

Read this first. The app lives in `creator-engine/`.

## What it is
Atlas Clipping (atlasclipping.com, app name "Atlas Clips") is a clipping marketplace.
- **Businesses** (streamers, brands, musicians, studios, agencies) fund campaigns.
- **Clippers** post short clips (TikTok, YouTube Shorts, Instagram Reels) from their own accounts.
- Clippers are paid for **verified views** (per 1K views, per clip, or a pool split by views).
- The business approves every clip. Payouts after approval are automatic.

## Stack
- Next.js 14 App Router (server components, server actions), TypeScript, Tailwind.
- Supabase (Postgres + RLS + storage + auth). Project ref `ijpfxbnxfpbhfzrjhdmz`.
- Stripe Connect Express (embedded onboarding, transfers). Discord bot + OAuth. Gemini support bot ("Nova").
- Tests: vitest (`npm test`, 130 tests). Type check: `npx tsc --noEmit -p .`.
- Hosting: Render auto-deploys branch `claude/kind-galileo-egdt9r`.

## Workflow rules (agreed with the owner)
- Develop and push on branch `claude/kind-galileo-egdt9r`. No pull requests unless asked.
- **Database changes**: add a numbered file in `creator-engine/supabase/migrations/` (next is `0025_…`).
  The owner runs the SQL in the Supabase SQL Editor. **Don't push code that needs a new column
  until the owner confirms the SQL ran**, or the live site breaks.
- Never commit secrets. Env vars live in Render (Stripe, Supabase, Discord, Gemini, TikTok, YouTube).
- Before pushing: `npx tsc --noEmit -p .` and `npm test` must pass.
- After UI changes: `npm run build:demo` then copy `demo-site/index.html` to `public/demo/index.html`.
- Check pages on a phone width (390px) and desktop. Owner wants clean, minimal, modern, dark,
  volt green (lime → green) brand, phone-first.
- Theme gotcha: `bg-white`/zinc classes flip in dark mode; use inline `#fff` for truly white things.
- Supabase returns max 1,000 rows per request: use `selectAll` / `selectAllIn` from `src/lib/fetch-all.ts`.

## Key places
- Money: `src/lib/pay-clip.ts` (payouts), `src/actions/creator.ts` (`cashOut`), `src/lib/tiers.ts` (fees by tier).
- Fees: clippers pay a flat 2% on cash-out (`feePct: 2` in `src/lib/tiers.ts`); businesses pay only Stripe card processing
  (`NO_SERVICE_FEE=true` on Render). Tiers mean faster pay, more cash-outs, gated campaigns.
- Referrals (`src/lib/referrals.ts`, migration 0024): invite link `/r/CODE`. For an invited clipper's first 90 days
  their 2% fee goes to the inviter (`referral_earnings`, paid by Stripe transfer; sync retries unpaid ones).
- Cash-outs: minimum $5 (`MIN_CASHOUT` in `src/lib/payout-rules.ts`). Stripe's payout charge is passed to the clipper
  (`src/lib/payout-costs.ts`: 0.25% + $0.15, plus $2.40 on the first Stripe payout of the month, covering Stripe's
  €0.10 + 0.25% per payout and €2 per active account). All payouts go through `sendCashOut` in `src/lib/cash-out.ts`.
- Founders: first 100 real clippers get `creators.founder_number` (trigger, migration 0022). Emerald badge + card.
- Data loading: `src/lib/data.ts`. Server actions: `src/actions/*`.
- Front page: `src/components/landing.tsx`, `landing-fx.tsx`, `views-chart-hero.tsx`.
- Clipper pages: `src/app/clipper/*`. Business pages: `src/app/streamer/*`. Settings: `src/app/account`.
- Admin (owner emails in `ADMIN_EMAILS`): `/admin/support`, `/admin/verify`, `/admin/clips` (find by CLP- ref),
  `/admin/test-data` (load/remove fake @atlas.test data).
- Discord: `src/lib/discord.ts` (role sync), `src/app/api/discord/interactions` (#verify button flow),
  `src/app/api/oauth/discord/*` (Connect Discord in Settings).
- Test data guard: fake clips have video ids starting `atlastest` and are never synced or paid (`src/lib/test-data.ts`).

## Current state (Nov 2026)
Done and live: campaigns (per 1K / per clip / pool, invite-only, tier gates), approve + approve-all,
Scout with filters and mass invite, tiers, founders, cards, one-tap cash-out, payout history,
clip references, support bot + tickets, Discord linking/verify, Settings tabs, account menu,
Discover search/filters, phone layout pass, animated front page.

## Open to-do
1. Slow pages with lots of data (Discover, Campaigns, Clips, Profile load every clip): add limits/pagination.
2. Fallback cover when a campaign thumbnail fails to load.
3. Earnings "By campaign" and Payout history: show top 10 + "Show all".
4. Business campaign page: sticky Approve-all bar, tabs Waiting / Live / Paid.
5. Instagram tracking waits on the owner's Meta developer app. X (Twitter) not supported (API is paid).
6. PayPal payouts wait on the owner's PayPal Business account.
7. Before launch: rotate keys that were shared in chat, remove test data, test one real cash-out.
