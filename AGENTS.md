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
- Tests: vitest (`npm test`, 142 tests). Type check: `npx tsc --noEmit -p .`.
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
- Fees: clippers pay a flat 5% on cash-out (`feePct: 5` in `src/lib/tiers.ts`); all Atlas margin comes from that.
  Businesses pay only Stripe's exact cost for their card (`NO_SERVICE_FEE=true` on Render), grossed up so the campaign
  gets the full budget: `src/lib/card-fees.ts`, priced from a Stripe ConfirmationToken in `quoteDeposit`/`createDepositIntent`
  (`src/actions/brand.ts`). `STRIPE_FX_PERCENT` (default 2) = conversion fee; set 1 if USD settlement is on in Stripe.
  Tiers mean faster pay, more cash-outs, gated campaigns.
- Referrals (`src/lib/referrals.ts`, migration 0024): invite link `/r/CODE`. Page `/clipper/invite` (Invite & earn: pitch,
  how it works, who joined with Active/days left, no per-person money); Earnings strip and one-time home popup (`components/invite/*`). For an invited clipper's first 90 days
  their 5% fee goes to the inviter (`referral_earnings`, paid by Stripe transfer; sync retries unpaid ones).
- Cash-outs: minimum $5 (`MIN_CASHOUT` in `src/lib/payout-rules.ts`). Stripe's payout charge is passed to the clipper
  (`src/lib/payout-costs.ts`: 0.25% + $0.15, plus $2.40 on the first Stripe payout of the month, covering Stripe's
  €0.10 + 0.25% per payout and €2 per active account). All payouts go through `sendCashOut` in `src/lib/cash-out.ts`.
- Google / Apple sign-in: Supabase OAuth (`oauthSignIn` in `src/actions/account.ts`, `components/forms/oauth-buttons.tsx`).
  Buttons show only with `AUTH_GOOGLE=true` / `AUTH_APPLE=true` on Render, after the provider is set up in Supabase.
- Private campaigns are link-only: `src/lib/private-link.ts` (signed key) + `/join/[id]` route (adds an accepted invite, which
  RLS uses to show the campaign; signed-out visitors sign up first, `atlas_join` cookie finishes it on clipper home).
  Scout is hidden for now (`SCOUT_ENABLED=true` shows it); plan: bring it back as a paid business feature.
- Trusted badge: `isTrusted` in `tiers.ts` (Platinum+ and no fraud flags in 90 days), shown to businesses on clips and profiles.
- Tier perk ideas kept for later: business-paid "tier bonus" rate (e.g. +10% for Diamond+), early access to new campaigns,
  longer invite earnings for higher tiers, Discord tier channels.
- Founders: first 100 real clippers get `creators.founder_number` (trigger, migration 0022). Emerald badge + card.
- Data loading: `src/lib/data.ts`. Server actions: `src/actions/*`.
- Front page: `src/components/landing.tsx`; hero `atlas-landing-hero.tsx` + `src/styles/atlas-landing.css`;
  `scroll-story.tsx` is built but not on the page yet (owner: keep the current page for now). Add `<ScrollStory />` to use it.
- Clipper pages: `src/app/clipper/*`. Business pages: `src/app/streamer/*`. Settings: `src/app/account`.
- Admin (owner emails in `ADMIN_EMAILS`): `/admin/support`, `/admin/verify`, `/admin/clips` (find by CLP- ref),
  `/admin/test-data` (load/remove fake @atlas.test data).
- Discord: `src/lib/discord.ts` (role sync), `src/app/api/discord/interactions` (#verify button flow),
  `src/app/api/oauth/discord/*` (Connect Discord in Settings).
- View checks on every sync: `assessViews` in `src/lib/fraud.ts` (5-minute bot burst, hollow jump = many new views with
  almost no new likes/comments/shares, sudden speed-up, low engagement overall, too many likes, more comments than likes,
  no shares on TikTok, views dropping). Fraud (score ≥85) stays flagged; review (≥50) holds the clip for the business,
  approving clears the ratio checks (`engagement_cleared`) but not new jumps. Also duplicate clips (pHash) and deleted videos.
  Limits are per platform (`BENCHMARKS` in `fraud.ts`, with the research sources in comments) and compare against the
  clipper's own usual engagement on their other clips. Tune them from real held/flagged clips after launch.
- Test data guard: fake clips have video ids starting `atlastest` and are never synced or paid (`src/lib/test-data.ts`).

## Current state (Nov 2026)
Done and live: campaigns (per 1K / per clip / pool, invite-only, tier gates), approve + approve-all,
Scout with filters and mass invite, tiers, founders, cards, one-tap cash-out, payout history,
clip references, support bot + tickets, Discord linking/verify, Settings tabs, account menu,
Discover search/filters, phone layout pass, animated front page.

## Money flow and Stripe facts (researched, Nov 2026)
- Platform Stripe account is in **Portugal** (EUR). Users are mostly tier-1 (US/UK/CA/AU/EU). Charges are in USD.
- Deposit: card charged on the platform (separate charges and transfers). Stripe PT: international cards 3.15% + €0.25,
  UK 2.5%, EEA 1.5% (premium 2.8%), +2% currency conversion USD→EUR, Radar ~€0.05. Business pays exactly this on top.
- Budgets sit in the platform Stripe balance; `campaigns.escrow_balance` tracks each campaign's share.
- Cash-out: Stripe transfer to the clipper's Express account (created with `fees.payer = application`), then Stripe pays
  their bank. Connect "you handle pricing": €2 per active account per month, 0.25% + €0.10 per payout, cross-border from 0.25%.
- Ideas not done yet (owner decides):
  - Owner should set platform payouts to **Manual** in Stripe, or Stripe pays held budgets out to the owner's bank.
  - Turn on **USD settlement** in Stripe (≈1% instead of 2% conversion twice) and set `STRIPE_FX_PERCENT=1`.
  - Clipper payout accounts are created without `country`; country is immutable. Check in test mode and ask the clipper's country.
  - Cross-border 0.25% for non-EEA clippers isn't passed on in `payout-costs.ts` yet.
  - New clipper payout accounts try Stripe-owned pricing first (`createClipperAccount` in `src/lib/stripe.ts`:
    `fees.payer = account`, `losses = stripe`; Stripe docs: no Connect fees for the platform or the account), falling back
    to the old setup if Stripe refuses (logged as "Stripe-owned pricing account refused"). Accounts on Stripe-owned pricing get
    no Stripe payout fee passed on at cash-out. Not yet verified with a real account. `STRIPE_OWNED_PRICING=false` turns it off.
  - Later, with revenue: a US entity + US Stripe account (US cards 2.9% + 30¢, ACH 0.8% capped $5, no FX for US users).
  - Referral ideas discussed, not built: "bring a business" reward (first access to that campaign, Connector badge,
    Discord role); count an invite only after the invitee's first approved clip; pay invite rewards as a fee discount.
    Self-referral via alt accounts is possible today; terms allow withholding rewards for fake accounts.
  - Inviters pay Stripe's $2.40 monthly fee on invite-reward transfers; owner may decide Atlas covers it.

## Open to-do
1. Slow pages with lots of data (Discover, Campaigns, Clips, Profile load every clip): add limits/pagination.
2. Fallback cover when a campaign thumbnail fails to load.
3. Earnings "By campaign" and Payout history: show top 10 + "Show all".
4. Business campaign page: sticky Approve-all bar, tabs Waiting / Live / Paid.
5. Instagram tracking waits on the owner's Meta developer app. X (Twitter) not supported (API is paid).
6. PayPal payouts wait on the owner's PayPal Business account.
7. Before launch: rotate keys that were shared in chat, remove test data, test one real deposit (exact budget lands)
   and one real cash-out (fees match the confirm screen), and one invite-link signup.
