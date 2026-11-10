# Email templates

Paste these into Supabase: **Authentication → Emails → Templates**.

| Supabase template | File | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirm your Atlas Clipping email |
| Magic Link | `magic-link.html` | Your Atlas Clipping sign-in code |

Links go to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`, where RedirectTo is `/auth/confirm?handoff=…` set by the sign-in form. Pressing Continue there confirms the email and the page that asked for the link signs in by itself (any browser or device), so the email tab can be closed. Email apps that pre-open links can't use the link up, because nothing happens until Continue is pressed. Plain tables and inline styles only, so they render the same in Gmail, Outlook and Apple Mail.

## Logo

Email apps block SVG, so the logo is a PNG: `public/brand/logo-email.png`. The templates load it from Supabase Storage:

1. Supabase → **Storage** → **New bucket**, name it `brand`, turn on **Public bucket**.
2. Open `brand` → **Upload file** → pick `creator-engine/public/brand/logo-email.png` (keep the name).

Once the site is live you can swap the URL in both templates for `https://atlasclipping.com/brand/logo-email.png`.
