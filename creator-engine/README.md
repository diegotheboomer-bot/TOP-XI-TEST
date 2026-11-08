# Creator Engine

Creator campaigns paid on API-verified views and attributed sales.
Next.js 14 (App Router) · Supabase · Stripe Connect · TikTok Display API · Tailwind.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (parser, payouts, fraud rules, pHash, encryption)
npm run build
```

With no Supabase keys the app runs in **demo mode** (`src/lib/demo.ts`). Everything is clickable and uses fake numbers and mock money, run through the same payout, fee and fraud code as production:

- **Brand** (`/brand`, as Voltline Energy): create campaigns, deposit mock escrow, go live, connect a store, approve or flag videos, pay creators (15% fee taken out). Each campaign page also has **Run 4h sync** (views grow, earnings recalculate, the velocity watchdog runs) and **Simulate sale**.
- **Creator** (`/creator`): use **Viewing as** to switch creators, then connect TikTok, set up payouts, join campaigns and submit a TikTok link (the parser is real; view counts are made up).
- **Reset** in the header restores the starting data. State lives in the server process, so restarting also resets it.

Well-known streamer names appear only in ordinary example rows. Fraud examples use made-up handles, and every brand is fictional.

## Set up for real

1. Create a Supabase project and run `supabase/migrations/0001_init.sql` (SQL editor or `supabase db push`).
2. Copy `.env.example` to `.env.local` and fill it in. `TOKEN_ENCRYPTION_KEY`: `openssl rand -base64 32`.
3. Supabase Auth → URL configuration: add `<APP_URL>/auth/callback` as a redirect URL.
4. TikTok developer app: Login Kit with scopes `user.info.basic`, `user.info.stats`, `video.list`; redirect URI `<APP_URL>/api/oauth/tiktok/callback`.
5. Stripe: enable Connect (Express). Webhook `<APP_URL>/api/webhooks/stripe` for `checkout.session.completed` and `account.updated` (Connect events).
6. Shopify: `orders/create` webhook to `<APP_URL>/api/webhooks/shopify`, signed with `SHOPIFY_WEBHOOK_SECRET`.
7. Cron: `vercel.json` calls `/api/cron/sync` every 4 hours with `Authorization: Bearer $CRON_SECRET`.

## How it works

| Piece | Where |
|---|---|
| Schema, constraints, RLS, escrow functions | `supabase/migrations/0001_init.sql` |
| Link parser (TikTok, Reels, Shorts, share-link resolution) | `src/lib/video-url.ts` |
| Submit flow: ownership check via creator's token, baseline metrics, duplicate check | `src/actions/creator.ts` → `submitVideo` |
| Metric sync, payout calc, velocity watchdog | `src/lib/sync.ts`, `src/lib/payout.ts`, `src/lib/fraud.ts` |
| Perceptual hash (DCT pHash of the video cover frame) | `src/lib/phash.ts` |
| Escrow deposit (Checkout), payouts (Transfer, 15% fee inline) | `src/actions/brand.ts`, `src/app/api/webhooks/stripe` |
| Conversion attribution (discount code or `?ref=`) | `src/app/api/webhooks/shopify` |

All writes go through server code using the service-role key after an ownership check; RLS only grants reads, so browsers can never write balances or metrics.

## Known limits

- Only TikTok is tracked. Instagram/YouTube links parse, but submission rejects them until their adapters (and ownership checks) exist.
- The velocity rule (+10k views in < 5 min, < 0.05% comments) is applied as a rate between samples. With 4-hour polling it cannot see a burst that happens and stops between two polls.
- Duplicate detection hashes the platform's cover image, not every frame of the video.
- One submission per creator per campaign, so the cap is per creator and conversions attach to that creator's submission.
