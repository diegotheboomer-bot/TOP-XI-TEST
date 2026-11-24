# The Salty Corner: handoff

Gift box shop, Algarve, Portugal. Branch: `salty-corner-demo`. Ignore the root README (unrelated project).

## Files
- `salty-corner/index.html`, `styles.css`, `app.js`: static site, no build step.
- `salty-corner/config.js`: empty = demo mode. Filled with Supabase URL + anon key = live mode.
- `salty-corner/assets/logo.jpg` (shop logo), `assets/sunshine-box.jpg` (product photo).
- `supabase/`, `render.yaml`, `.github/workflows/keepalive.yml`, `SALTY-CORNER-SETUP.md`: optional Supabase + Render + Stripe backend. Written but never run against real accounts.

## Design (keep exactly)
Inspired by the logo: green striped scalloped shop awning, warm lit window, watercolour feel, soft and cute.
- Colours (CSS variables in `styles.css`): cream `#fbf7ec`, paper `#fffdf7`, stripe `#fbecd3`, sage `#eef3e6 / #dfe8d2 / #a9bf94 / #7a9867 / #557049 / #34472f`, glow `#f7d98f`, terracotta `#c9805f`, rose `#e8b4ad`, sky `#b7d0d8`, gold `#a8935a`, ink `#2c3327`.
- Fonts: Cormorant Garamond (headings), Josefin Sans (small caps labels, buttons), Nunito Sans (body).
- Signature elements: awning (`.awning`), round logo with glow in the hero, pill buttons, filter pills in one rounded bar, gift box SVG illustrations (`boxSVG` in `app.js`), "shop window" shelf in the box builder, slide-in basket drawer.
- Copy rules: very little text. No emojis. No long dashes. Headline: "Little boxes of joy, wrapped with love".
- Mobile first: no horizontal scroll at 390px.

## Products
- Confirmed: The Sunshine Box, EUR 50, photo `assets/sunshine-box.jpg`, contents: storybook "Lilly's Dream", music box ("You Are My Sunshine"), heart-shaped jewellery box, colouring book and coloured pencils, pen and magnetic bookmark, thumb push puppet. Hand-wrapped, shipping all Portugal.
- The other 5 boxes and the box builder are made-up placeholders. Do not sell them.

## Goal and open decision
Go live today with a shop the owner's mother can run. Email: thesaltycorner.pt@gmail.com.
Options discussed: Wix (all-in-one, about USD 29/month Core), or Supabase + Render + Stripe + Resend (about USD 0 to start, more hands-on). Not decided. Stripe, payments and domain need the owner's own identity and bank details.
