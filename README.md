[README.md](https://github.com/user-attachments/files/29058418/README.md)
# TOP-XI-TEST# WC 2026 — World Cup Hub

A FotMob-style **FIFA World Cup 2026** web app, wired to **live data** from
[API-Football](https://www.api-football.com/) (api-sports.io).

- **Next.js 14** (App Router) · **TypeScript** (strict, zero `any`) · **Tailwind CSS** · **Zustand** (persisted fan ratings)
- World Cup 2026 only — league `1`, season `2026`.
- The API key is read **server-side** from an environment variable and never reaches the browser. Responses are cached with Next's fetch cache so the rate limit is respected.

## Setup

```bash
cd wc26
cp .env.example .env.local      # then paste your api-sports.io key
npm install
npm run dev                     # http://localhost:3100
```

`.env.local` (git-ignored):

```
API_FOOTBALL_KEY=your_api_sports_key_here
API_FOOTBALL_LEAGUE=1
API_FOOTBALL_SEASON=2026
```

Other scripts: `npm run build` (production build + type-check), `npm run start`.

## Pages

| Route | Live data shown |
|-------|------------------|
| `/` | Live / today / recent / upcoming fixtures (sectioned by the real current date) |
| `/match/[id]` | Header + tabs: Overview · Timeline · Stats · Line-ups · Ratings |
| `/groups` | All 12 groups with real standings (P/W/D/L/GD/Pts), top-2 highlighted |
| `/team/[id]` | Team header, group position, fixtures/results, full real squad |
| `/search` | Instant client-side search across real teams and fixtures |

### Match tabs (all real)
- **Overview** — goals with assists, key stats (incl. xG), match info
- **Timeline** — goals, cards, subs and VAR on a center spine
- **Stats** — possession, shots, shots on target, xG, corners, pass accuracy, fouls, offsides, cards, saves
- **Line-ups** — starting XI on a pitch using the API's positional **grid**, plus bench + coach
- **Ratings** — the **official** API match rating per player (blue badge) plus an interactive 1–10 **fan vote** that blends into a live average and saves to `localStorage`, plus a Man of the Match vote

## Architecture

```
wc26/
├── .env.local                    # API key (server-only, git-ignored)
├── src/
│   ├── app/                      # async server components fetch + render
│   │   ├── page.tsx              # home
│   │   ├── groups/page.tsx
│   │   ├── search/page.tsx       # fetches, hands data to <SearchClient>
│   │   ├── match/[id]/page.tsx   # dynamic — fixture + detail in parallel
│   │   └── team/[id]/page.tsx    # dynamic — squad + standings + fixtures
│   ├── components/               # reusable UI (Crest, MatchCard, GroupTable,
│   │   │                         #   StatBar, TabSystem, Pitch, PlayerRow…)
│   │   └── match/                # MatchHeader + per-tab views
│   ├── lib/
│   │   ├── api.ts                # ★ server-only API-Football client + mappers
│   │   ├── types.ts              # domain types (mapped from API responses)
│   │   └── utils.ts              # dates, pitch coords, hashing, helpers
│   └── store/
│       └── useRatingsStore.ts    # Zustand + persist (fan ratings, MOTM)
```

### How the data layer works
`src/lib/api.ts` is the single integration point. It:
- fetches with `fetch(..., { next: { revalidate } })` — lists refresh ~60s,
  finished-match detail caches longer, live matches refresh ~30s;
- maps raw API-Football JSON into the app's clean domain types, so every UI
  component stays decoupled from the provider;
- exposes `getFixtures`, `getFixture`, `getMatchDetail`, `getGroups`,
  `getSquad`, plus `splitSections` / `fixturesForTeam` selectors.

Because the file is only imported by server components and reads
`process.env.API_FOOTBALL_KEY` (no `NEXT_PUBLIC_` prefix), the key is stripped
from the client bundle entirely.

Swapping providers later means editing only `src/lib/api.ts`.
