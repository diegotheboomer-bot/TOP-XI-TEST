# Atlas Clips

Clipping campaigns for streamers. Streamers fund a campaign and pin moments from their streams; clippers claim moments, post clips to TikTok, YouTube Shorts and Instagram Reels, and get paid for the views the platforms report.
Next.js 14 (App Router) · Supabase · Stripe Connect · TikTok Display API · YouTube Data API · Tailwind.

In the code, `brands` are the campaign owners (streamers) and `creators` are the clippers.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (parser, payouts, fraud rules, pHash, encryption)
npm run build
```

With no Supabase keys the app runs in **demo mode** (`src/lib/demo-core.ts`). Everything is clickable and uses mock money, run through the same payout, fee and fraud code as production. Every streamer, clipper and number is invented.

- **Streamer** (`/streamer`, as Marlow Kade): create campaigns (thumbnail upload, platforms, review window), fund them from the **Add budget** popup (mock card form), cancel them for a refund, pin moments, approve or flag clips, pay clippers. **Run 4h sync** advances time: views grow, earnings recalculate, the bot watchdog runs and overdue clean clips auto-approve.
- **Clipper** (`/clipper`): switch clippers with **Viewing as**, browse Discover, join, claim a moment, submit a TikTok, Shorts or Reels link, and choose how to get paid: bank or debit card (mock Stripe form), PayPal or Venmo.
- **Reset** in the sidebar restores the starting data.

Campaign photos are CC0 images from StockSnap and Rawpixel; see `public/demo/thumbs/credits.json` (also linked from the landing page).

### Shareable single-page demo

`npm run build:demo` builds the same demo as one self-contained page, `demo-dist/index.html`, that runs entirely in the browser (`standalone/main.tsx`). It reuses the app's components and demo logic (`src/lib/demo-core.ts`), follows light/dark mode, uses fictional creators only, and keeps each visitor's changes in their own browser.

## Set up for real

1. Create a Supabase project. In the SQL Editor, paste and run `supabase/setup.sql` once (all migrations in one transaction), or run `supabase/migrations/` in order with `supabase db push`. `0002` creates the `campaign-thumbnails` storage bucket; `0003` adds platforms and the moment board; `0004` adds payout methods (PayPal/Venmo). If you already ran an older `setup.sql`, run just the newer files from `supabase/migrations/`.
2. Copy `.env.example` to `.env.local` and fill it in. `TOKEN_ENCRYPTION_KEY`: `openssl rand -base64 32`.
3. Supabase Auth → URL configuration: add `<APP_URL>/auth/callback` as a redirect URL.
4. YouTube: a Data API v3 key in `YOUTUBE_API_KEY` (public video statistics).
5. TikTok developer app: Login Kit with scopes `user.info.basic`, `user.info.stats`, `video.list`; redirect URI `<APP_URL>/api/oauth/tiktok/callback`.
6. Stripe: put the secret and publishable keys in `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and enable Connect. Add a webhook `<APP_URL>/api/webhooks/stripe` for `payment_intent.succeeded` and `refund.failed` (your account) and `account.updated` (connected accounts), and put its signing secret in `STRIPE_WEBHOOK_SECRET`. If you add a Content-Security-Policy, allow `js.stripe.com` and `connect-js.stripe.com`.
7. PayPal (optional, for clippers who want PayPal or Venmo): a PayPal Business account with [Payouts](https://developer.paypal.com/docs/payouts/standard/) access (you request it; PayPal approves). Create a REST app and put its keys in `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` (`PAYPAL_ENV=live` for real money). Add a webhook `<APP_URL>/api/webhooks/paypal` for the `PAYMENT.PAYOUTS-ITEM.*` events and put its ID in `PAYPAL_WEBHOOK_ID`. Payouts are paid from your PayPal balance, so keep it topped up. Without these keys, clippers can only choose bank or debit card.
8. Shopify (optional merch store): `orders/create` webhook to `<APP_URL>/api/webhooks/shopify`, signed with `SHOPIFY_WEBHOOK_SECRET`.
9. Cron: `vercel.json` calls `/api/cron/sync` once a day (the most Vercel's free Hobby plan allows) with `Authorization: Bearer $CRON_SECRET`. For the intended every-4-hours refresh, switch the schedule to `0 */4 * * *` on Vercel Pro, or call the endpoint from any external scheduler.

## Fees

Streamers pay a platform fee on top of the budget they add (`PLATFORM_FEE_PERCENT`, default 9%). The checkout shows the budget and the fee as separate lines; only the budget goes into the campaign, and clippers are paid 100% of what they earn. Stripe's processing and Connect payout costs, and PayPal's payout fee (typically 2% with a cap, paid by the sender) come out of the fee.

A streamer can cancel a campaign at any time. Earnings stop growing, approved clips keep what they've earned (still paid out as normal), clips still waiting for review don't earn, and the unspent budget is refunded to the original card (Stripe: usually 5–10 business days). The fee is not refunded, and Stripe doesn't return its processing fee on refunds either. Budget freed up later (for example by flagging a clip) can be refunded from the same place. A refund the card issuer rejects goes back into the campaign budget.

## How it works

| Piece | Where |
|---|---|
| Schema, constraints, RLS, escrow functions | `supabase/migrations/0001_init.sql` |
| Link parser (TikTok, Reels, Shorts, share-link resolution) | `src/lib/video-url.ts` |
| Submit flow: ownership check via creator's token, baseline metrics, duplicate check | `src/actions/creator.ts` → `submitVideo` |
| Metric sync, payout calc, velocity watchdog | `src/lib/sync.ts`, `src/lib/payout.ts`, `src/lib/fraud.ts` |
| Perceptual hash (DCT pHash of the video cover frame) | `src/lib/phash.ts` |
| Funding: "Add budget" popup with Stripe's Payment Element (budget + 9% fee on top) | `src/components/checkout/`, `src/actions/brand.ts` → `createDepositIntent`, `src/app/api/webhooks/stripe` |
| Cancel and refund unspent budget (fee kept) | `src/components/cancel-campaign.tsx`, `src/actions/brand.ts` → `cancelCampaign`, `src/lib/refunds.ts` |
| Clipper payout setup: bank or debit card (Stripe's embedded onboarding), PayPal or Venmo (PayPal Payouts); clippers keep 100% | `src/app/clipper/payouts`, `src/components/payouts/`, `src/lib/payout-methods.ts`, `src/lib/paypal.ts`, `src/actions/brand.ts` → `releasePayout`, `src/app/api/webhooks/paypal` |
| Conversion attribution (discount code or `?ref=`) | `src/app/api/webhooks/shopify` |
| Campaign thumbnails (upload to Supabase Storage, designed cover fallback) | `src/actions/brand.ts` → `createCampaign`, `src/components/views.tsx` → `CampaignCover` |
| Budget forecast (committed, available, days left at current pace) | `src/lib/budget.ts` |
| Ad disclosure (#ad) and clip-code ownership checks; review deadlines with auto-approval | `src/lib/compliance.ts`, applied in `src/lib/sync.ts` |
| Moment board (pinned timestamps with limited claims) | `supabase/migrations/0003_streamer_clipping.sql` → `claim_moment`, `src/actions/creator.ts` → `claimMoment` |
| YouTube Shorts stats | `src/lib/platforms/youtube.ts` |

All writes go through server code using the service-role key after an ownership check; RLS only grants reads, so browsers can never write balances or metrics.

## Known limits

- Tracking: TikTok (via the clipper's login) and YouTube Shorts (public stats, ownership by clip code) are implemented. Instagram Reels is accepted in the demo only: real tracking needs the clipper's Instagram professional account through Meta's API, which isn't built yet, so the real app rejects Reels links for now.
- The velocity rule (+10k views in < 5 min, < 0.05% comments) is applied as a rate between samples. With 4-hour polling it cannot see a burst that happens and stops between two polls.
- Duplicate detection hashes the platform's cover image, not every frame of the video.
- One submission per clipper per campaign, so the cap is per clipper and merch orders attach to that clipper's submission.
