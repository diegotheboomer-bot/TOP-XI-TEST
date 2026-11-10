# Email templates

Paste these into Supabase: **Authentication → Emails → Templates**.

| Supabase template | File | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirm your Atlas Clipping email |
| Magic Link | `magic-link.html` | Your Atlas Clipping sign-in link |

Links go to `https://atlasclipping.com/auth/confirm?token_hash={{ .TokenHash }}&type=email`. That page signs the person in only when they press Continue, so it works in any browser and email apps that pre-open links can't use the link up. Plain tables and inline styles only, so they render the same in Gmail, Outlook and Apple Mail.

## Logo

Email apps block SVG, so the logo is a PNG: `public/brand/logo-email.png`. The templates load it from Supabase Storage:

1. Supabase → **Storage** → **New bucket**, name it `brand`, turn on **Public bucket**.
2. Open `brand` → **Upload file** → pick `creator-engine/public/brand/logo-email.png` (keep the name).

Once the site is live you can swap the URL in both templates for `https://atlasclipping.com/brand/logo-email.png`.
