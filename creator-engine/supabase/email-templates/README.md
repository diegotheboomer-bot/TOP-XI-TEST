# Email templates

Paste these into Supabase: **Authentication → Emails → Templates**.

| Supabase template | File | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | Confirm your Atlas Clipping email |
| Magic Link | `magic-link.html` | Your Atlas Clipping sign-in link |

They use `{{ .ConfirmationURL }}`, which Supabase fills in. Plain tables and inline styles only, so they render the same in Gmail, Outlook and Apple Mail.
