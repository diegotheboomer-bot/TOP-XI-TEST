# The Salty Corner: going live

Stack: Render (website) + Supabase (database, checkout and webhook functions) + Stripe (payments) + Resend (order emails to the shop).

## Accounts (use thesaltycorner.pt@gmail.com)
1. Supabase: new project (free). Region close to Portugal.
2. Render: new account, connect this GitHub repo.
3. Stripe: new account, finish business verification. Turn on the payment methods you want (cards, MB WAY) in Settings > Payment methods. Turn on customer receipts in Settings > Emails.
4. Resend: sign up with the SAME email as NOTIFY_EMAIL below. Without a verified domain, Resend only delivers to that address.

## Supabase
- Run `supabase/migrations/20261122000000_init.sql` (SQL editor).
- Deploy `create-checkout` and `stripe-webhook` (from `supabase/functions`). `verify_jwt` is off for both (see `supabase/config.toml`).
- Function secrets:

| Name | Value |
|---|---|
| STRIPE_SECRET_KEY | Stripe secret key |
| STRIPE_WEBHOOK_SECRET | from the Stripe webhook (next step) |
| SITE_URL | the Render site address, no trailing slash |
| NOTIFY_EMAIL | thesaltycorner.pt@gmail.com |
| RESEND_API_KEY | Resend key |
| SHIPPING_CENTS | optional, shipping fee in cents (default 0 = free) |
| EMAIL_FROM | optional, only after verifying a domain in Resend |

## Stripe
- Webhook endpoint: `https://<project>.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`

## Render
- New Blueprint from this repo (`render.yaml`): static site published from `salty-corner/`.

## Website
- Fill `salty-corner/config.js` with the Supabase URL and publishable (anon) key. Empty = demo mode.

## Keep Supabase awake (free plan)
- GitHub repo secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY`. `.github/workflows/keepalive.yml` pings twice a week.

## Products
- Live products are rows in the `products` table (price in cents). Only The Sunshine Box (EUR 50) is seeded.
- Other boxes and the box builder show "Coming soon" in live mode until real products are added.

## Not tested yet
The functions and SQL have not run against real Supabase or Stripe accounts. Test with Stripe test mode first.
