# Phase 1 roadmap — build order for agents

Execution plan for the remaining Phase 1 work. Each step is one PR on a
`<type>/<name>` branch off `main` (see `docs/BRANCHING.md`), reviewed
before the next step starts. The per-step `Branch:` lines below are the
original plan names.

**Before starting any step, read:** `CLAUDE.md` (hard rules),
`docs/ARCHITECTURE.md` (module boundaries, testing conventions),
`docs/BRANCHING.md` (git workflow), and the skills in `.claude/skills/`
(grand-tour, nextjs, tailwind, shadcn). The canonical visual reference is
`reference/grand-tour.html` — port design details from it, never invent a
new aesthetic.

## Ground rules that apply to every step

- All gates green before commit: `pnpm lint`, `pnpm typecheck`,
  `pnpm test`; overall coverage stays above 85% (`pnpm test:coverage`).
- Colocated unit tests written WITH the code; reused mock data in
  `src/test/fixtures/` as `make*` builders — never inline in test files.
- Max 300 lines per source file; split by responsibility.
- Lib domains consumed via `@/lib/trip`, `@/lib/ai`, `@/lib/http`; server
  code only via `@/lib/trip/service` / `@/lib/ai/generate`.
- Tokens only (`bg-paper`, `text-brass`, `.frost`, `.eyebrow`, …) — never
  hardcoded colors. Both themes + reduced motion checked on UI work.
- Keyboard accessibility: ESC closes overlays, focus trapped in modals.
- Conventional Commits; no AI/assistant references in git history.
- Verify UI work in a real browser (headless Chromium is available;
  see the screenshot scripts pattern in past sessions) before pushing.

**Deploying:** production only deploys from published `vX.Y.Z` releases,
and `v1.0.0` (the first production deploy) is gated on the MVP checklist
in `docs/RELEASE.md`. Do not wire any host to auto-deploy `main`.

## Status

| Step | Scope                                                          | State   |
| ---- | -------------------------------------------------------------- | ------- |
| 1    | Scaffold, tooling, tokens, schema                              | ✅ done |
| 2    | Redis service, /api/trips, /api/generate, limits               | ✅ done |
| 3    | Map + CityDrawer + TimelineRail (reference design)             | ✅ done |
| 3.5  | Monitoring (Sentry), SonarQube, CI checks                      | ✅ done |
| 4    | Manual editor + Nominatim + localStorage + My Maps             | ✅ done |
| 5    | /t/[id] shared view + OG image + remix                         | ✅ done |
| 6    | AI chat UI + ghost-stops upsell                                | ✅ done |
| 7    | Landing page + polish pass                                     | ✅ done |
| 8    | Playwright e2e                                                 | ✅ done |
| 9    | UX & a11y hardening (design-review follow-ups)                 | ✅ done |
| 10   | Legal pages, report link, AI notice, analytics                 | ✅ done |
| 11   | `/about` story page, motion limits on the map                  | ✅ done |
| 12   | Landing: destination search, returning visitors                | ✅ done |
| 13   | Affiliate links, phase A (stays, activities, eSIM, insurance)  | ✅ done |
| 13b  | Affiliate links: transit and car legs                          | planned |
| 13c  | Affiliate links: flights (IATA) and packing gear               | planned |
| 14   | Share-loop branding: link preview, poster, remix measurement   | planned |
| 15   | Logo (route D) across icons, UI, previews and poster; SEO data | ✅ done |
| 16   | SEO schemas: FAQPage and BreadcrumbList                        | planned |
| 16b  | SEO schema: Organization (gated on operator name)              | planned |
| 17   | Destination route pages for search                             | planned |

---

## Step 4 — Manual editor, localStorage store, My Maps

Branch: `feature/editor`

**Deliverables**

1. `src/lib/trip/local-store.ts` (client-safe, part of the trip domain):
   CRUD over localStorage — keys `trips:index` (id[]) and `trips:{id}`
   (Trip JSON). Zod-parse everything read back; drop corrupt entries.
   Local ids via `nanoid(8)`. No auto-deletion. Unit-test with a mocked
   localStorage. Export via the domain barrel (it is isomorphic-safe:
   guard on `typeof window`).
2. `/new` editor page (`src/app/new/page.tsx` + `src/components/editor/*`):
   - Query modes: blank, `?from=ai` (payload read from a localStorage
     handoff key written by the AI flow), `?remix={localId}`.
   - Stops list: add / remove / **drag-to-reorder** (keyboard-operable
     too), inline editing of all City fields, per-leg mode picker
     (`select` with the 5 modes) + label + duration.
   - Custom **trip title** field, defaulting to `DEFAULT_TRIP_TITLE`
     ("Grand Tour").
   - Live map preview: reuse `TripMap` (it already handles any valid
     Trip); preview updates as fields change (debounced).
   - **City search via Photon** (`https://photon.komoot.io/api/`, built
     for search-as-you-type; public Nominatim forbids autocomplete),
     debounced ≥500ms with stale requests aborted. Wrap in
     `src/lib/geo-search/` domain (index.ts public API) so the provider
     can be swapped; unit-test the response mapping with fixtures.
   - Guest limit layer 2: always-visible `n/5 stops` counter; "Add city"
     at 5/5 opens the **UpsellModal** ("Sign up for up to 15 stops,
     permanent links & PDF export" — visible locked features, Phase 2
     teaser only, no real auth).
   - Legs stay consistent: reordering/removing cities rebuilds legs so
     `legs.length === cities.length - 1` always holds.
3. `/maps` My Maps page: list from local store (title, stops, nights,
   updated time), open → `/new?remix=`, share → POST + link, delete with
   `alert-dialog` confirm.
4. Share button (editor + My Maps): POST `/api/trips` → on `201 {id}`
   show share dialog with copyable `/t/{id}` URL; on
   `403 {error:"city_limit"}` open UpsellModal; on 413/429/500 show
   in-voice error toasts (`sonner`).

**Primitives needed** (vendor per `.claude/skills/shadcn` if registry
blocked): `input`, `textarea`, `label`, `select`, `dialog`,
`alert-dialog`, `dropdown-menu`, `sonner`, `card`, `skeleton`.

**Definition of done**: create a 3-city trip manually, reorder stops,
share it (mock Redis locally is fine — the route is tested), see it in
My Maps, remix it, delete it; 5th-city upsell fires; all gates green.

---

## Step 5 — Shared view `/t/[id]`, OG image, remix

Branch: `feature/share-links`

**Deliverables**

1. `src/app/t/[id]/page.tsx` — async Server Component: `getTrip(id)`
   (refreshes TTL) + `incrViews(id)`; render the read-only
   `TripExperience` plus:
   - "Remix this trip" → copies snapshot into viewer's localStorage via
     the local store, then routes to `/new?remix={newLocalId}`.
   - "Create your own" CTA → `/new`.
2. Missing/expired id → `notFound()` with a designed in-voice
   `not-found.tsx` ("This map has expired…") + create CTA.
3. `generateMetadata` (title = trip title via the `%s · DrawMyTrip`
   template, description from stats) **and** `opengraph-image.tsx` with
   `next/og`: brand tokens, route line drawn from city coordinates
   (scale `routeBounds` into the 1200×630 canvas), city names, title.
   This is the social-share hook — required, not optional.
4. Read-only mode: `TripExperience` gets an optional `actions` variant so
   the shared view shows Remix/Create CTAs (no editor affordances).

**Definition of done**: with real Upstash env, share → open `/t/{id}` in
a fresh profile → drawer/map fully work, OG image renders (check
`/t/{id}/opengraph-image`), expired id shows the designed page, remix
lands in the editor with a copy.

---

## Step 6 — AI chat + ghost-stops upsell

Branch: `feature/ai-chat`

**Deliverables**

1. `src/components/ai/ai-chat.tsx` (+ `/plan` route or modal from
   landing): guided 3-question flow — destination/region, days (2–30),
   vibe (relaxed/balanced/packed) — matching `GenerateRequestSchema`.
   ONE call to `/api/generate` (route already exists), styled as an
   in-voice chat (frost bubbles, brass accents), with `skeleton` loading
   state ("Drafting your route…").
2. Success → write `{trip, suggestedExtra}` to the localStorage handoff
   key → `/new?from=ai` (AI drafts, human edits).
3. `suggestedExtra` → **ghost stops**: grayed, locked markers on the
   editor map (approximate positions are fine — no geocoding of ghosts;
   render as dashed/40%-opacity pills with a lock); tap/click opens
   UpsellModal (layer 3 of the guest limit).
4. Error handling per route contract: 429 → "The atlas needs a breather"
   retry-later state; 502/503 → clear error, editor opens blank.

**Definition of done**: mocked `/api/generate` returns a fixture trip in
tests; with a real `AI_BASE_URL` + `AI_MODEL` the flow lands a 5-city draft in the
editor with ghost stops; upsell opens from a ghost stop.

---

## Step 7 — Landing page + polish pass

Branch: `feature/landing`

**Deliverables**

1. `/` becomes the real landing: hero with the **live demo map**
   (`SAMPLE_TRIP` experience, exactly what exists today) plus two CTAs —
   "Plan with AI" (→ chat) and "Build manually" (→ `/new`) — and a
   "My maps" link. Keep the immersive full-bleed character; CTAs live in
   the floating chrome (e.g. a bottom-right frost cluster or a topbar
   slot), Fraunces display + brass `Button` variant.
2. Polish pass across all pages: loading/empty/error states in-voice,
   responsive audit at 360/768/1280, focus-visible audit, reduced-motion
   audit, no layout shift on theme toggle, Lighthouse a11y ≥ 95.
3. Copy pass: everything speaks "field atlas" voice (see reference).

**Definition of done**: browser-verified screenshots light+dark at 3
breakpoints; every journey reachable from `/`.

---

## Step 8 — Playwright e2e (LAST)

Branch: `feature/e2e`

**Deliverables**

1. Install via CLI: `pnpm create playwright@latest` (or
   `pnpm dlx playwright install` pattern) — tests in `e2e/`
   (max-lines-exempt), config `playwright.config.ts`, script
   `test:e2e`. In this remote environment use the pre-installed
   Chromium (`executablePath: /opt/pw-browsers/chromium`); never run
   `playwright install`.
2. Mock network at the edge: route-intercept `/api/generate` (fixture
   trip) and `/api/trips` (fake id) — no real LLM/Redis in e2e.
   `/t/{id}` reads Redis on the server, so `e2e/fake-upstash.ts` (an
   in-memory Upstash REST stub started by Playwright) serves it; tests
   seed snapshots with `seedSharedTrip`. OpenFreeMap, Photon and
   `/api/rates` are stubbed per test.
3. Four core journeys:
   1. manual create → share → open `/t/{id}` → remix
   2. AI create flow (mocked generate) → editor prefilled
   3. guest 5-city limit → upsell modal (editor + ghost stop)
   4. expired trip page (`getTrip` → null path).
   5. (added) units: switch to miles + another currency, persists.
   6. (added) atlas card: stop detail from itinerary and marker, ESC
      back, packing state, legend, landing CTAs, Customize → My maps;
      mobile sheet rest/open/map-tap and marker tap.
4. Wire `test:e2e` into CI as a separate job (build → start → test
   against `localhost:3000`; cache browsers).

**Definition of done**: `pnpm test:e2e` green locally and in CI.

---

## Step 9 — UX & a11y hardening

Follow-ups from a heuristic design review, triaged against the code
(generic or already-handled points dropped). Three PRs:

1. `fix/editor-state` — editor resolves its draft after mount (no
   hydration mismatch on `/new?remix=`); inline validation via
   `draftIssues` (blank title / city name, nights clamped 0–30) and Share
   focuses the first invalid field; the open detail panel follows its
   stop through reorders and deletes; every detail input is labelled.
2. `feature/editor-a11y` — reorder/delete announced in an `aria-live`
   region, grip-only drag with a drop indicator, Undo toast on delete,
   visible focus on the title input, editor map follows the active stop.
3. `feature/trip-view-a11y` — marker focus ring and keyboard-focused
   markers panned clear of the atlas card, hover sync row ↔ marker,
   `title` on truncated names, fluid card width, desktop collapse.

**Definition of done**: gates + e2e green; browser-verified light/dark at
desktop and mobile; Lighthouse a11y ≥ 95 on `/`, `/new`, `/maps/[id]`.

---

## Step 13 — Affiliate links, phase A

Branch: `feat/affiliate-links`

Monetise through contextual booking links instead of display ads: no
script on our pages, no cookies until a visitor clicks, nothing over the
map. Links are computed at render time from the trip, so the schema,
Redis snapshots and the 50KB cap do not change.

**Decisions (change before starting if wrong)**

- Network: Travelpayouts umbrella first (one marker ID covers
  GetYourGuide, Viator, Airalo and others); Booking.com or Stay22 for
  stays. A provider without an ID in env is hidden, so the feature ships
  dark and turns on per provider.
- Phase A covers stays, activities, eSIM and travel insurance. Transit
  and car legs are 13b; flights and packing gear are 13c.
- Link formats are NOT assumed: each program's deep-link pattern is
  confirmed from its partner dashboard after approval, then recorded in
  `src/lib/affiliate/providers.ts` with a test per provider.

**Deliverables**

1. `src/lib/affiliate/` (internal package, `index.ts` public API, pure,
   no server-only). `config.ts` reads the `NEXT_PUBLIC_AFFILIATE_*` ids
   (public by nature, not secrets) and exposes which providers are on.
   `providers.ts` holds one URL builder per provider. `links.ts` exposes
   `stopLinks(city, dates?)` and `tripLinks(trip)`, returning
   `{ id, kind, provider, href, messageKey }[]`. `lib` returns message
   keys, never copy.
2. Safety in the builders: every href is `https`, built on a fixed
   provider host, with user text only in `encodeURIComponent`ed query
   values. A test asserts the host allowlist. Campaign tags are static
   (`dmt-stay`, `dmt-act`, `dmt-esim`, `dmt-ins`); never a trip id.
3. UI: an `AffiliateBlock` (props in, no fetching) in the city detail
   Practical tab, under local tips: eyebrow label, 3 to 4 plain text
   rows with an external-link icon, and one disclosure line. Also on the
   shared `/t/{id}` view. Not on the map, poster, print view, OG image,
   editor, or landing. Hidden entirely when no provider is on.
4. Link attributes: `target="_blank"` and
   `rel="sponsored noopener noreferrer"`. `noreferrer` also keeps the
   `/t/{id}` share URL from reaching partners.
5. Copy in `src/i18n/messages/en.json` (labels, disclosure line). Styling
   with existing tokens only; both themes, reduced motion, keyboard focus
   visible, 44px touch rows on mobile.
6. Analytics: add `affiliate_click` to `AnalyticsEvent` and fire it on
   click. `shortcut: no provider property, Vercel Hobby drops custom
events anyway, upgrade when on Pro.`
7. Legal: `/privacy` gains a third-party links section naming each
   partner and the data sent on click (destination, dates); `/terms`
   gains the affiliate disclosure. Update `docs/RELEASE.md` checklist.
8. Docs: `docs/ARCHITECTURE.md` module map entry for `lib/affiliate`;
   `.env.example` lists every `NEXT_PUBLIC_AFFILIATE_*` key.

**Tests (written with the code)**

- Unit: each provider builder (encoding, accents and `&` in city names,
  dated vs undated stays, disabled provider omitted, host allowlist);
  `stopLinks`/`tripLinks` ordering and empty result.
- Component: block renders rows and attributes, disclosure present,
  renders nothing with no providers, click fires the event.
- Fixtures: `makeAffiliateConfig` and link builders in
  `src/test/fixtures/`.
- e2e: extend the shared-view journey to assert link attributes only.

**Definition of done**: gates green, coverage above 85%, light+dark
screenshots at 360/768/1280 checked, `grand-tour-review` Must-fix
resolved, `TODO(legal)` items updated.

## Step 13b — Transit and car legs

Per-leg link under the leg row, chosen by `leg.mode`: train and bus
(Omio, Trainline, 12Go), ferry (Direct Ferries), car (Discover Cars).
Dated from `StopDates` when the trip has a start date. Same lib,
component and legal rules as Step 13.

## Step 13c — Flights and packing gear

Flights need IATA codes: add a small city-to-IATA dataset or lookup
(`shortcut:` with a documented upgrade path), then flight-leg links.
Packing items (adapter, power bank, bottle) gain "Get one" links per
storefront region. Only after 13 and 13b show real clicks.

---

## Step 14 — Share-loop branding

Branch: `feat/share-branding`

Every shared map is the product's best advert, so someone who sees the
link preview or the poster should be able to find the site. The remix
button already exists on `/t/[id]` (`PrimaryActions`, "Remix this
trip" next to "Create your own"); this step does not rebuild it.

**What exists today**: the poster footer says "DrawMyTrip" but shows no
address; the `/t/[id]` link preview (`og-card.tsx`) shows the route with
no brand or address at all; nothing measures whether remix is used.

**Decisions (change before starting if wrong)**

- Branding is the wordmark plus the site host (from
  `NEXT_PUBLIC_SITE_URL` via `@/lib/http/site-url`), kept as one value
  so a Phase 2 premium "no watermark" can drop it later. No toggle now.
- Keep the remix button as is; only fix its placement if the mobile
  check below shows it hidden.
- The host in production comes from `NEXT_PUBLIC_SITE_URL`; set it
  before launch or the preview shows the Vercel fallback host.

**Deliverables**

1. Link preview: a small footer in `OgCard` with the wordmark and host,
   the map area shrunk to fit. Both brand strings come from `en.json`
   (the OG route reads the catalog directly, as `opengraph-image.tsx`
   does now).
2. Poster: the host line under the existing "DrawMyTrip" brand line in
   `draw-poster.ts` (footer already ends near y 1276 of 1350). The share
   action also sends the site URL as text with the image.
3. A pure `siteHost(url)` helper (strip scheme, `www.` and trailing
   slash) with tests, used by both the preview and the poster. Confirm
   first that `site-url.ts` is safe to import from client code; if not,
   pass the host in as a prop from a server component.
4. Measure the loop: add `remix_started` and `poster_downloaded` to
   `AnalyticsEvent`, fired from the remix handler in `trip-experience`
   and the poster download. `shortcut: no properties, custom events need
Vercel Pro (see the existing TODO(analytics)), upgrade on Pro.`
5. Mobile check: on `/t/[id]` at 390px, confirm the remix button is
   visible without expanding the bottom card. If it is hidden, make the
   collapsed card show it; otherwise change nothing.

**Tests (with the code)**

- Unit: `siteHost` cases (scheme, `www.`, trailing slash, port,
  invalid input falls back).
- `og-card` test: brand and host render; long titles still fit.
- `poster-dialog` test: the share call includes the URL text; the
  download fires its event. Remix handler fires its event once.
- Fixtures: reuse `makeTrip`; no new mock data in test files.

**Definition of done**: gates green, coverage above 85%; screenshots
checked: poster in light and dark, the `/t/[id]/opengraph-image` PNG
with a short and a long trip title, and `/t/[id]` at 390 and 1280;
`grand-tour-review` Must-fix resolved; `docs/RELEASE.md` mentions
setting `NEXT_PUBLIC_SITE_URL`.

---

## Step 16 — SEO schemas: FAQPage and BreadcrumbList

Branch: `feat/seo-schemas`

The landing page already ships `WebSite` and `WebApplication` JSON-LD
(`src/lib/http/json-ld.ts`). This step adds the next two schemas that
help search engines understand the public pages, using the same safe
serializer (`<` escaped so a value cannot close the script tag).

**Decisions (change before starting if wrong)**

- `FAQPage` goes on `/about`, built from the same data as `AboutFaq` so
  the schema and the visible answers can never disagree. Google now shows
  FAQ rich results only for well-known sites, so the gain is better
  understanding, not a guaranteed rich result.
- `BreadcrumbList` goes on About, Plan, Privacy, Terms and Contact
  (Home, then the page). Shared maps (`noindex`) get nothing.
- No `Review`, `AggregateRating` or `Product` schema: there are no real
  reviews, and fake ones risk a manual penalty.
- `HowTo` is skipped: Google dropped its rich result.

**Deliverables**

1. Move the FAQ questions and answers into one typed list that both
   `AboutFaq` and the schema read (copy stays in `en.json`).
2. `faqJsonLd(items)` and `breadcrumbJsonLd(trail, baseUrl)` in
   `src/lib/http/json-ld.ts`, beside `siteJsonLd`, exported through
   `@/lib/http`. Plain text only: markup in answers is stripped.
3. Render each as a `<script type="application/ld+json">` on its page,
   the way `src/app/page.tsx` does.
4. `docs/ARCHITECTURE.md`: one line on where schemas live.

**Tests (with the code)**

- Unit: both builders (shape, absolute URLs from the base URL, `<`
  escaped, empty list returns no FAQ block).
- Page tests: the script tag is present and its answers match the
  visible FAQ text.

**Definition of done**: gates green, coverage above 85%; both schemas
pass Google's Rich Results Test and the Schema.org validator on the
preview deploy; `grand-tour-review` Must-fix resolved.

## Step 16b — Organization schema

Branch: `feat/seo-organization`

`Organization` on the home page with `name`, `url`, `logo` (the
`/icons/512` image) and a `contactPoint` using `CONTACT_EMAIL`. Linked
from `WebSite` through `publisher`. **Blocked until `OPERATOR_NAME` in
`src/lib/legal/operator.ts` is final** (the open `TODO(legal)`), as the
schema would publish that name. Same builder, tests and checks as Step 16.

## Step 17 — Destination route pages

Branch: `feat/destination-pages`

The main long-term search lever: pages that match what people type
("7 days in Japan route map", "Italy itinerary") and give them a
ready, editable route. Each page is static, indexable and unique.

**Decisions (change before starting if wrong)**

- Content: each route is a `Trip` JSON validated by `TripSchema`
  (5 stops or fewer, under the 50KB cap), drafted with the AI planner
  and then edited by hand. No thin or near-duplicate pages: each needs
  its own intro text, practical notes and a distinct route.
- First batch of 5 to 10 destinations: **confirm the list before
  starting** (candidates: Italy, Japan, Portugal, Greece, Thailand).
  Adding one later is one JSON file plus its copy.
- URLs: an index at `/routes` and one page at `/routes/[slug]`, built
  with `generateStaticParams` (no Redis, no server cost).
- The page reuses `TripExperience`. The call to action is "Customize
  this route", which already copies a trip into a local draft and opens
  the editor (`handleEditRoute`). Confirm during implementation whether
  that needs a new variant beside `demo`, `shared` and `own`, or can
  reuse `demo` with a different `cta`.
- Affiliate stay and activity links (Step 13) show here automatically
  when configured, since the pages use the same city detail panel.

**Deliverables**

1. `src/lib/destinations/` (internal package, `index.ts` public API):
   the curated route list, a `getDestination(slug)` lookup, and a test
   that every file passes `TripSchema` and has a unique slug.
2. `/routes` (index, links to each page) and `/routes/[slug]` (map,
   route, intro text), with per-page title, description, canonical and
   share image through `pageMetadata` and `shareMetadata`.
3. Structured data per page: `BreadcrumbList` (Step 16 builder) and
   `TouristTrip` (schema.org subtype of `Trip`) with the stops as the
   `itinerary` `ItemList`. No Google rich result exists for it, so it is
   for understanding only.
4. Sitemap: add `/routes` and every slug, with a real `lastModified`
   from the route file rather than the build time.
5. Internal links: the landing page, About and the footer link to
   `/routes`, with descriptive link text.
6. Copy for intros and page chrome in `en.json`; the long guide text per
   route lives beside its route data.
7. Analytics: `route_page_customized` event on the call to action
   (`shortcut: no properties, records on Vercel Pro only`).

**Tests (with the code)**

- Unit: the schema test above; slug lookup (found, unknown returns
  null); sitemap includes every slug.
- Page tests: metadata, canonical and the JSON-LD for one route; an
  unknown slug returns not found.
- e2e: open a route page, press "Customize this route", land in the
  editor with the stops filled in.

**Definition of done**: gates green, coverage above 85%; screenshots of
`/routes` and one route page in light and dark at 390 and 1280;
Lighthouse SEO and accessibility at or above 95; the pages pass the Rich
Results Test; `grand-tour-review` Must-fix resolved.

---

## One-time human tasks (not agent work)

- [ ] Upstash Redis created; `UPSTASH_REDIS_REST_URL` / `_TOKEN` in
      `.env.local` + deploy host env.
- [ ] `AI_BASE_URL` / `AI_MODEL` (+ `AI_API_KEY` if needed) in `.env.local` + deploy host env.
- [ ] Sentry project created; `NEXT_PUBLIC_SENTRY_DSN` set (optional
      `SENTRY_ORG/PROJECT/AUTH_TOKEN` in CI for source maps).
- [x] SonarQube: Automatic Analysis ON (no token); New Code = previous version.
- [ ] Branch protection on `main`: Lint, Typecheck, Unit tests &
      coverage, Build, Conventional title + SonarQube quality gate;
      1 review; linear history (see `docs/BRANCHING.md`).
- [ ] Optional: allowlist `ui.shadcn.com` in the remote environment's
      network policy so `shadcn add` works in cloud sessions.
- [ ] `RELEASE_PLEASE_TOKEN` repo secret (PAT) so CI runs on release PRs.
- [ ] Affiliate programs (after the first production deploy; most need a
      live site): Travelpayouts, Booking.com or Stay22, then set the
      `NEXT_PUBLIC_AFFILIATE_*` ids in the deploy host env (Step 13).
- [ ] SEO launch tasks (after the first production deploy): set
      `NEXT_PUBLIC_SITE_URL=https://drawmytrip.akhiakl.in`; verify the site
      in Google Search Console and Bing Webmaster Tools (the
      `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` env vars) and
      submit `/sitemap.xml`; redirect any `www` or extra host to the one
      domain in Vercel; confirm the destination list for Step 17.
- [ ] `VERCEL_TOKEN` repo secret for the release deploy; `main` auto-deploy is
      skipped by Vercel's Ignored Build Step (see `docs/RELEASE.md`).

## Phase 2 parking lot (do NOT build in Phase 1)

Auth (NextAuth), Postgres, premium tier (15 cities, `PERSIST`ed
permanent links, PDF export, custom themes, no watermark), views
dashboard, GraphQL/tRPC transport, editing inside the floating atlas
card (one layout for view and edit, instead of the split editor). The trip service stays plain
functions so a different transport can wrap it later.
