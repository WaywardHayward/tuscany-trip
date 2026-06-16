# Research — Collioure & the Côte Vermeille (Option 11)

**Author:** 🦊 collioure-fox (planner)
**Date:** 2026-06-16
**Repo:** WaywardHayward/tuscany-trip
**Spec:** `memory/projects/collioure-trip.md` (Status: spec-locked) — in the `~/clawd` workspace, not this repo.
**Branch / worktree:** `feature/collioure-trip` @ `~/dev/working-trees/tuscany-trip-collioure-fox` (cut off `origin/main`).

This is a tech memo, not a TODO list. It records *what* was investigated and *why* the chosen
direction is right, so a future reader (or the implementer-otter) understands the decisions.

---

## 1. The job in one line

Add an **11th** destination option to the holiday-shortlist site: a relaxed, **single-base**
fortnight built around **Collioure**, the little Catalan/Fauvist harbour on the Côte Vermeille,
staying in an **Airbnb-style pool villa**, reached **entirely by train**, with rail/boat/bus
day-trips fanning out from Collioure. Deliverables: a new self-contained `collioure.html` +
an Option 11 card (and two style-block entries) in `index.html`.

---

## 2. The site's architecture (what I read)

The site is a **static, no-build** holiday shortlist. Each "trip" is one self-contained HTML file
in the repo root (~29–36 KB each). There is **no framework, no bundler, no `images/` folder** —
images are **hotlinked from Wikimedia Commons** and every `<img>` carries an `onerror` fallback.
Three shared assets are reused by every page:

| Shared file | Role |
|---|---|
| `presentation.js` (16.5 KB) | The Leaflet map "Play the journey" engine. Reads a `stops[]` array passed to `TripPresentation.init([...])`. **This is the only JS that matters for a new page.** |
| `presentation.css` (5.9 KB) | Styling for the map overlay / flyer cards. |
| `enhance.css` (10.3 KB) + `enhance.js` (3.6 KB) | Progressive-enhancement niceties (the `.play-journey-btn`, reveal helpers etc.). Loaded on every page. |

Each page also carries its **own inline `<style>` block** (the per-page palette + layout) and an
inline IntersectionObserver snippet for `.reveal` fade-ins. So a new page is fully self-contained
*except* for the four shared files above, which it just `<link>`/`<script src>`s like its siblings.

### Sibling pages surveyed
`france.html` (33.5 KB, 281 lines), `cap.html`, `spain.html`, `croatia.html`, `tuscany.html`,
`naples.html`, `rome.html`, `portofino.html`, `sardinia.html`, `atlantic.html`. The `index.html`
(33 KB) holds the option-card grid + two style blocks.

---

## 3. Why `france.html` is the template

`france.html` (the Carcassonne & Languedoc page) is the **closest sibling** and the right clone base:

- Same travel shape: **Eurostar → Paris (overnight) → TGV south → single French base**.
- Single-base structure already (Carcassonne is one base; day-trips fan out).
- French/southern subject matter, same warm palette family.
- Its `stops[]` array at the very bottom is the **exact shape** we need (single `base:true` + spokes).
- **Bonus:** Collioure already appears *inside* `france.html` as a single day-trip card and as the
  final stop in its journey. We are promoting that day-trip into its own base page — so the tone,
  the Fauvism framing, and even a usable Wikimedia hero image (`Collioure_002.jpg`) are already
  proven in-repo. Reuse them.

### Anatomy of `france.html` (top → bottom) — the structure to mirror
1. `<head>`: charset, **Microsoft Clarity** script block (verbatim, same `x7hxl336a5` tag id),
   viewport, Google Fonts (`Bricolage Grotesque` + `Inter`), a big inline `<style>` (CSS custom
   props in `:root`, then hero/intro/facts/timeline/cards/base/know/footer rules + responsive
   media queries), then `<link>`s to Leaflet CSS, `presentation.css`, `enhance.css`.
2. `<header class="hero">`: full-bleed Wikimedia hero `<img>` with `onerror`, eyebrow ("Option six · …"),
   `<h1>`, a lead `<p>`, and a `.meta` row of 4 pill spans.
3. `.wrap` container with:
   - a "← all the summer options" back-link,
   - `.intro` (`.lead` with an `<em>` highlight + `.body` paragraph) + the `.play-journey-btn`
     (`onclick="TripPresentation.open()"`),
   - `.facts` — a 4-up grid of `.fact` (`.k` big value + `.v` caption),
   - `.sec` "The shape of it" → `<h2>` + `.sub` + the **`.timeline`** `<ul>` of `.t-item`s,
   - `.sec` "Where we'd stay" → the **`.base`** block (`.base-grid` = `.base-img` + `.base-txt`
     containing `.stays` → 3× `.stay` anchors),
   - `.sec` "The big hitters" → a **`.grid`** of `.card` anchors (the day-trip cards),
   - (france has a second "Pick your day at the sea" `.grid` — optional extra, we may fold the
     spokes into one grid),
   - `.sec` "Good to know" → the **`.know`** 2×2 grid of `.box`es (getting there / around / eating
     meat-free / heat-shade-sea),
   - `<footer>`.
4. Inline IntersectionObserver `<script>` for `.reveal`.
5. `<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js">`, `<script src="presentation.js">`.
6. The inline **`TripPresentation.init([...])`** stops array.
7. `<script src="enhance.js">`.

---

## 4. The map geometry — the spoke gotcha (most important technical finding)

I read `presentation.js` to nail down exactly how the single-base "spokes" map is driven, because
the spec calls this out as a trap that bit the team on another page. The mechanics
(`baseIdx`, `baseFor`, `isDaytrip`, `legFrom`, `legCurve`):

- **Exactly one stop carries `base:true`.** That is the hub (here: **Collioure**).
- A stop with **`kind:"travel"`** draws as a **straight line** (an approach leg). It never arcs.
- A **post-base stop with NO `kind`** (or explicit `kind:"daytrip"`) **auto-arcs as a spoke** out
  from the base and back — `isDaytrip()` returns `true` for "any other post-base stop".
- **`legCurve()` fans successive spokes** with alternating sign, resetting the fan per base, so the
  day-trips don't stack on top of each other.
- **Subtle but critical (confirmed in `france.html`):** a *rest day that sits AT the base location*
  must be tagged **`kind:"travel"`** too. In france.html, "A slow day in Carcassonne" (Day 5) uses
  the base coords but is flagged `kind:"travel"` so the engine treats it as a no-op-at-home anchor
  instead of drawing a spurious arc/line in from the previous excursion. We replicate this for
  Collioure's rest/beach-at-home days.

### The rule the otter MUST follow (bake into the plan)
```
Collioure            → { base:true, coords:[42.5263,3.0830], ... }   // the SINGLE hub
Edinburgh, Paris     → { kind:"travel", ... }                        // approach legs = straight
A "rest day in       → { kind:"travel", coords:[42.5263,3.0830], ... } // anchor at home, no arc
   Collioure"
Day-trips (Banyuls,  → { coords:[...], ... }  // NO kind ⇒ auto-spoke, fanned automatically
   Céret, Perpignan,
   Cadaqués, Argelès,
   Port-Vendres …)
```
If an approach leg is missing `kind:"travel"`, it wrongly arcs. If a day-trip is wrongly given
`kind:"travel"`, it won't spoke. That's the whole gotcha.

### Coordinates gathered for the stops array (Côte Vermeille)
| Place | Approx lat,lon | Role |
|---|---|---|
| Edinburgh | 55.953, -3.188 | travel (start) |
| Paris | 48.856, 2.352 | travel (overnight) |
| **Collioure** | **42.5263, 3.0830** | **base:true** (the hub) |
| Port-Vendres | 42.5187, 3.1067 | spoke (next harbour) |
| Banyuls-sur-Mer | 42.4828, 3.1280 | spoke (Maillol / swim / marine reserve) |
| Cerbère / border | 42.4430, 3.1680 | spoke (end of the French line) |
| Argelès-sur-Mer | 42.5450, 3.0250 | spoke (long sandy beach) |
| Perpignan | 42.6986, 2.8956 | spoke (Catalan capital, TER hub) |
| Céret | 42.4861, 2.7497 | spoke (Cubism museum, cherries) |
| Cadaqués (ES) | 42.2884, 3.2770 | spoke (Dalí village over the border) |
| Figueres (ES) | 42.2667, 2.9610 | spoke (Dalí Theatre-Museum, optional) |

(Collioure's own coords `42.5263,3.0830` match the value france.html already uses for its Collioure
day-trip stop — consistent.)

---

## 5. Content constraints (hard rules) — and *why* they matter

These are not stylistic preferences; they are **standing rules for this site** (MEMORY.md travel
prefs) and the #1 anti-goals in the spec. Encoded so the otter cannot drift:

### 5a. ZERO alcohol — anywhere
No wine, vineyards-as-an-activity, tastings, "by the glass", aperitif, cellar, rosé, sommelier.
**This region is a minefield:** Collioure and Banyuls are *world-famous for fortified wine*
(Banyuls AOC, Collioure AOC). The temptation to write "a glass on the harbour" or "the famous
Banyuls cellars" is exactly what must NOT happen. **Frame the coast instead around:**
- **Swimming** (coves, the marine-reserve snorkel trail at Banyuls, sandy Argelès).
- **Fauvism & art** — the whole reason Collioure is famous: Matisse & Derain *invented* Fauvism here
  (1905); the town has a **Fauvism trail** with reproductions on easels where they painted.
  Aristide **Maillol**'s home town is Banyuls (sculptures, his metairie/museum). **Céret** = "the
  Mecca of Cubism" (Picasso, Braque, Soutine; Musée d'Art Moderne). **Dalí** at Cadaqués / Cap de
  Creus and the Theatre-Museum at Figueres.
- **Markets, coastal walks, the fort & bell-tower, the light.**
- A scenery mention of *vines on the hillside* is tolerable ONLY if not framed as a drink activity —
  but the safest move is **none at all**, so the grep gate passes clean.

### 5b. Train-first throughout
Edinburgh → London → **Eurostar** → Paris (overnight) → **TGV to Perpignan (~5 h)** → **TER to
Collioure (~19 min)**. Day-trips by **TER**, **liO bus line 540**, or the **seasonal coastal boat**
only. The Côte Vermeille rail line literally strings the coast together, so this works end-to-end.

### 5c. NO car — and say so explicitly
No car, no car hire, no "you could drive this one". Unlike the Carcassonne page (which used a guided
minibus for the off-rail Cathar castles), **the entire Côte Vermeille is on the rail line + liO buses
+ a boat**, so the trip is **100 % car-free** — the practical-notes box should state this as a
positive ("no car needed at any point").

### 5d. Vegetarian / meat-free food box
The region's signature is **anchovies** (Collioure anchovies are protected/IGP) — so the food box
must **substitute**: **escalivada** (roast pepper/aubergine), **pa amb tomàquet** (tomato bread),
grilled veg, **socca**-style chickpea pancakes, market fruit (peaches, figs, melon, Céret cherries),
**crème catalane** for pudding. Catalan/Roussillon veg table, anchovies acknowledged-but-skipped.

### 5e. Single base only
**Collioure only.** Alex was explicit ("one base in Collioure"). No multi-centre / two-centre
variant, no "tack on a night in X". (france.html's "fancy a night out east?" spark line should NOT
be copied verbatim — keep it single-base.)

---

## 6. The real stays (Airbnb pool villas) — from spec §Research

Alex asked for "an Airbnb like Alexandra's [in St Paul de Vence] with a pool". The PM already ran
Playwright over Airbnb with the pool filter on Collioure and found **live listings**. Use these three
(treat prices as indicative search-card ranges; link the Airbnb room URLs
`https://www.airbnb.co.uk/rooms/<id>`):

1. **"Spacious VILLA, 4 bedrooms with private pool!"** — ★4.94 (17 reviews), Superhost (Karine),
   4 bed / 5 beds / 2 bath, sea + mountain view, **private pool**, self check-in.
   Room id `1337581153118721690`. → **The headline "Alexandra's-style" pick** (private villa + pool).
   Indicative ≈ £1,800 / 5 nights off-peak as a guide.
2. **"Villa-Casaroom Collioure: 2 bedrooms"** — ★5.0, 2 bed / 3 beds / 2 bath, private bathrooms.
   Room id `996298341693822037`. → **Cosier 2-bed alternative.**
3. **"360° view of the Bay of Collioure – Villa Karma"** — sea-view villa, business host.
   Room id `1186634315187957411`. → **The view splurge.**

Backups also seen (if a primary 404s, swap in): "Villa for 4–6 with sea view, private residence"
(`1502255657916053881`); "Beautiful 2-room, bay view, terrace, parking and pool" (`662797718962557482`).

**Stay-block treatment:** mirror france.html's `.stays` → 3× `.stay` anchors, each with a Wikimedia
thumbnail (with `onerror`), `.nm` name, a `.star` rating, a `.px` "≈£…" range, and a `.ds` description.
Link to the Airbnb room URLs (Alex specifically asked for "an Airbnb"). Frame the villa-with-a-pool as
"your own place with a pool, the day-trips come to you" — the Alexandra's-villa vibe.

---

## 7. Rail logistics (from spec §Research, confirmed via lookups) — indicative

- **Edinburgh → London → Paris:** LNER ~4h10 + Eurostar ~2h20, **overnight in Paris** (same as siblings).
- **Paris (Gare de Lyon) → Perpignan:** direct **TGV ~5 h**, several daily.
- **Perpignan → Collioure:** **TER ~19 min**, several daily — Collioure is a stop on the
  Perpignan ↔ Cerbère/Portbou Côte Vermeille line.
- Net: Edinburgh → Paris (night) → TGV Perpignan → 19-min TER to Collioure.

### Day-trips (all car-free)
- **Port-Vendres** — working fishing harbour, next stop (TER / liO 540). Markets, sea.
- **Banyuls-sur-Mer** — TER ~10–15 min; seafront, **Maillol** sculptures & his home town, underwater
  **marine reserve snorkel trail**. (Art + swimming, NOT the fortified wine.)
- **Cerbère / the border** — end of the French line; the dramatic Belvédère.
- **Céret** — **"the Mecca of Cubism"** (Picasso, Braque, Soutine), Musée d'Art Moderne, cherries,
  the great single-arch **Pont du Diable**. Reached by liO bus (no car).
- **Perpignan** — the **Catalan capital**: Palace of the Kings of Majorca, Le Castillet, the
  Hyacinthe Rigaud museum. ~19 min TER hub.
- **Cadaqués & Cap de Creus (Spain)** — **Dalí's** whitewashed village over the border; reachable
  car-free via train to the border + connecting bus/boat, or a coastal boat excursion. **Figueres**
  (Dalí Theatre-Museum) is on the rail line via Portbou.
- **Argelès-sur-Mer** — long sandy beach, next stop north, easy swim day.
- **Collioure itself** — Château Royal, the **Notre-Dame-des-Anges bell-tower in the water**, the
  **Fauvism trail** (Matisse/Derain easels), the market town, swimmable coves, the **Fort Saint-Elme**
  walk.

---

## 8. `index.html` integration — exactly where it plugs in

`index.html` needs an **Option 11 card** + a **per-trip class in BOTH style blocks**. I located the
precise lines:

- **Gradient block** (`.opt-ph` backgrounds), lines ~98–106. Each trip has one rule, e.g.
  `.opt--cap .opt-ph{background:linear-gradient(140deg,#1b3a52,#2f7fa8 55%,#2db0c4)}` (line 106).
  → Add `.opt--collioure .opt-ph{...}` here.
- **Accent block** (`--ac` custom prop), lines ~219–229. Each trip has one rule, e.g.
  `.opt--cap{--ac:47,127,168}` (line 229).
  → Add `.opt--collioure{--ac:…}` here. **Both are required** or the card hover glow / shimmer break.
- **Card markup:** clone the Option 10 (cap) `<a class="opt opt--ready opt--cap reveal" href="cap.html">…</a>`
  block (index.html lines ~458–474) → make it `opt--collioure`, `href="collioure.html"`, `opt-num`
  "Option 11", `status status--ready` "Plan ready", an `opt-label` ("Collioure &amp;<br>the Côte
  Vermeille"), a `movebadge movebadge--one` "1 base", meta, blurb (~12-13 days, single base, rail),
  3 `opt-tag`s ("Seaside", "Catalan", "Art &amp; swims"), and a "See the full plan →" link. Insert it
  **after the Option 10 card** (after its closing `</a>`, before the grid's closing `</div>`).
- **Minor copy bump:** the summary block lower down reads *"Ten plans, all ready to read end to end"*
  and the heading *"Ten plans …"* (index.html ~line 477+). Bump **Ten → Eleven** so the count stays
  honest. (Small, easy to miss — flagged as a checklist item.)

---

## 9. Visual identity for the new card (chosen)

The grid already uses: france = warm terracotta (`#b06a3a` family), cap = blue (`#2f7fa8`),
sardinia/croatia = teal/jade, spain = ochre/rust. To stay **visually distinct**, Collioure gets a
**warm Mediterranean terracotta → sea-blue blend** (the Fauvist-harbour palette: red roofs + bell-tower
+ blue bay):

- **Gradient:** `linear-gradient(140deg,#b8432e,#e08a3a 50%,#1f8fa0)` (red-terracotta → amber → sea-teal).
- **Accent `--ac`:** `224,138,58` (the warm amber midpoint) — tune if it clashes with france/spain in
  the grid; the implementer has final say on the exact hex, the requirement is "distinct".
- **`opt-label`:** "Collioure &amp;<br>the Côte Vermeille".
- **Tags:** "Seaside", "Catalan", "Art &amp; swims".
- The new page's own inline palette can lean a touch warmer/bluer than france's green-jade, but it
  must stay within the same CSS-custom-prop system and type scale — **do not introduce a new visual
  language**, just re-tune the `:root` values (paper/ink stay; accent greens → a Catalan
  terracotta-and-sea accent).

---

## 10. Alternatives considered

- **Clone `cap.html` instead of `france.html`?** Rejected. cap is Riviera/coastal-train but it's a
  *different* approach (no Paris-overnight emphasis the same way, different palette). france matches
  the Eurostar→Paris→TGV-south + single French base shape and already contains Collioure content.
- **Multi-centre (Collioure + a Spanish night in Cadaqués)?** Rejected — Alex explicitly said single
  base. Cadaqués stays a day-trip spoke.
- **Self-hosting real villa photos?** Rejected — site convention is Wikimedia hotlinks + `onerror`; no
  `images/` folder. Stays use representative Wikimedia thumbnails, linking out to the Airbnb listings.
- **Google-Maps search links vs Airbnb room links for the stays?** Chose **Airbnb room URLs** because
  Alex asked for "an Airbnb like Alexandra's"; the listings are real (PM Playwright research). Maps
  links remain the fallback pattern if a listing dies.

---

## 11. Open questions

**None blocking.** Spec §5 resolved all of them (base = Collioure; real pool villas exist; length
~12–13 nights single-base). The only implementer-discretion items are cosmetic: the exact accent hex,
and whether to fold france's two day-trip grids into one "big hitters" grid (recommended: one grid is
cleaner for a single-base page). Neither needs an Alex decision.

→ Plan can proceed to **READY_FOR_IMPLEMENTATION**.
