# Plan — Collioure & the Côte Vermeille (Option 11)

**Author:** 🦊 collioure-fox (planner)
**Date:** 2026-06-16
**Repo:** WaywardHayward/tuscany-trip
**Branch / worktree:** `feature/collioure-trip` @ `~/dev/working-trees/tuscany-trip-collioure-fox` (off `origin/main`)
**Research:** `./copilot-tracking/research/collioure-trip.md` (read it first — it has the spoke gotcha, the real listings, the rail facts, the visual identity)
**Spec:** `~/clawd/memory/projects/collioure-trip.md` (Status: spec-locked)

**STATUS: READY_FOR_REVIEW**

---

## Goal

Ship an **11th** holiday option — a **single-base, rail-first, car-free, alcohol-free, vegetarian**
fortnight built around **Collioure** — as a new self-contained `collioure.html` (cloned from
`france.html`) plus an **Option 11** card and two style-block entries in `index.html`. Success =
both pages open in a browser with **no JS console errors**, the map **initialises with Collioure as
the sole `base:true`** and day-trips fanning as spokes, the Option 11 card renders and links through,
and the **grep gates for booze/car return nothing**.

---

## Affected files

| File | Change | Why |
|---|---|---|
| `collioure.html` | **NEW** (~32–35 KB, single self-contained page) | The Option 11 trip page; clone of `france.html` with Collioure content + a single-base spokes `stops[]` array. |
| `index.html` | **EDIT** — add Option 11 card + `.opt--collioure` in the `.opt-ph` gradient block (~L98–106) + `.opt--collioure` in the `--ac` accent block (~L219–229) + bump "Ten plans"→"Eleven plans" summary copy | Wire the new page into the shortlist grid; both style blocks are required or the card hover/placeholder break. |
| `copilot-tracking/research/collioure-trip.md` | **NEW** (done by planner) | RPI research memo; commits with the PR. |
| `copilot-tracking/plans/collioure-trip.md` | **NEW** (this file) | RPI plan; the otter ticks off tasks + logs deviations here; commits with the PR. |

**No other files.** Do NOT touch the other 10 trip pages. Do NOT add shared CSS/JS, an `images/`
folder, or any dependency. Reuse `presentation.js`, `presentation.css`, `enhance.css`, `enhance.js`.

---

## Approach

1. **Clone, don't reinvent.** Start `collioure.html` as a copy of `france.html` and swap content
   section-by-section, preserving the exact structure, class names, head/Clarity block, font links,
   CSS-custom-prop system, reveal observer, Leaflet + `presentation.js` + `enhance.js` script tags.
2. **Re-tune the palette** in the inline `:root` toward a Catalan terracotta-and-sea accent (keep
   paper/ink; shift the green-jade accents). Match the type scale exactly — no new visual language.
3. **Single-base map geometry** (the key bit — see research §4): Collioure is the only `base:true`;
   Edinburgh + Paris are `kind:"travel"`; any rest/beach-at-home day at Collioure coords is
   `kind:"travel"`; every day-trip stop has **no `kind`** so it auto-spokes.
4. **`index.html`**: add the card by cloning the Option 10 (cap) block, plus the two style-block lines.
5. **Verify with Playwright** (load both pages, assert no console errors + map init + card link),
   then run the grep gates.

The 200-line code rule does **not** apply to these hand-authored HTML pages — the bar is "match the
sibling pages" (~30–36 KB single files). Conventional commits throughout
(`feat(collioure): …`), with the model-attribution suffix per `CODE_STYLE.md`.

---

## Task breakdown (otter ticks these off as it works)

### Phase 0 — setup (worktree already exists)
- [x] 0.1 Confirm you're in `~/dev/working-trees/tuscany-trip-collioure-fox` on `feature/collioure-trip`
      (the planner cut it off `origin/main`; the research + plan docs are already here on the branch).
- [x] 0.2 Push an **empty starter commit** first for board liveness (RECIPES §Worktree-per-pup):
      `git commit --allow-empty -m "chore: start feature/collioure-trip [skip ci]"` then
      `git push -u origin feature/collioure-trip`.

### Phase 1 — `collioure.html` skeleton
- [x] 1.1 Copy `france.html` → `collioure.html` as the starting point.
- [x] 1.2 **Head:** keep the Clarity block verbatim; set `<title>` = **"Collioure & the Côte Vermeille · Helen & Alex"**;
      update any `og`/meta/description to mirror siblings (Collioure subject). Keep all font + CSS links.
- [x] 1.3 **Palette:** re-tune the inline `:root` custom props toward terracotta-and-sea (keep
      `--paper`/`--ink`; shift accent greens/jade to a Catalan warm-amber + sea-teal). Don't rename
      props; just change values. Keep the responsive media queries.

### Phase 2 — copy (ZERO booze, train-first, no car, veg — see research §5)
- [x] 2.1 **Hero:** Wikimedia Collioure image with `onerror`; eyebrow "Option eleven · Collioure & the
      Côte Vermeille"; an `<h1>` (e.g. "A Catalan harbour to call home"); a lead `<p>`; `.meta` row of
      4 pills (e.g. "~12–13 days", "All by rail", "One harbour base", "Art, coast & swims").
- [x] 2.2 **Intro:** `.lead` (with an `<em>` highlight) + `.body` paragraph framing Collioure around
      **Fauvism/art, swimming, markets, coastal walks, the bell-tower & fort** — never drink.
      Keep the `.play-journey-btn`.
- [x] 2.3 **Facts:** 4-up `.fact` strip (e.g. "1 base — Collioure, on the line" / "Fauvism — where
      Matisse & Derain invented it" / "rail · bus · boat — 100% car-free" / "high-20s — sea-breeze coast").
- [x] 2.4 **Timeline (`~12–13 days`, single base):** author `.t-item`s. Day 1 = down to the south
      (Eurostar→Paris→TGV), arrive Collioure; then settle days + day-trips + at least one explicit
      **rest/beach day**; end with a turn-for-home `.t-branch`. Use `t-item--travel` for the
      approach/rest days and plain `t-item` for day-trips, mirroring france. **No "tack on a night
      elsewhere" — single base.** Suggested spine:
      `01 Down to the Catalan coast (rail, overnight Paris→TGV→TER)` ·
      `02 Into Collioure (arrive, the bell-tower & harbour at dusk)` ·
      `03 Collioure in full (Château Royal, the Fauvism trail, a swim in the cove)` ·
      `04 Banyuls (Maillol sculptures + the marine-reserve snorkel trail)` ·
      `05 A slow day at home (market, the villa pool, a cove — nowhere to be)` [rest] ·
      `06 Céret, the Mecca of Cubism (Musée d'Art Moderne, Pont du Diable, cherries)` ·
      `07 Perpignan (Palace of the Kings of Majorca, Le Castillet, the markets)` ·
      `08 Port-Vendres & Cap Béar (working harbour, coastal-path walk)` ·
      `09 Over the border to Cadaqués & Cap de Creus (Dalí's village, by boat/bus — car-free)` ·
      `10 Argelès / a long beach day (sand & swims)` ·
      `11 Collioure encore (Fort Saint-Elme walk, easels, last swim)` ·
      `+ turn for home`. (Otter may merge/reorder to land ~12–13 days; keep the rest day.)
- [x] 2.5 **"Where we'd stay" base block:** the `.base` → `.base-grid` (`.base-img` + `.base-txt`)
      with `.stays` → **3× `.stay` anchors = the real Airbnb pool villas** (research §6):
      (1) "Spacious VILLA, 4 bedrooms with private pool" → `https://www.airbnb.co.uk/rooms/1337581153118721690`
      ★4.94, ≈£1,800/5nt-ish range, the headline private-villa-with-pool pick;
      (2) "Villa-Casaroom Collioure (2 bed)" → `https://www.airbnb.co.uk/rooms/996298341693822037` ★5.0, cosier;
      (3) "360° Bay view – Villa Karma" → `https://www.airbnb.co.uk/rooms/1186634315187957411`, the view splurge.
      Each `.stay`: Wikimedia thumbnail (`onerror`), `.nm`, `.star`, `.px` "≈£…", `.ds`. Intro copy =
      "your own place with a pool, the day-trips come to you" (the Alexandra's-villa vibe).
      **Do NOT copy france's "fancy a night out east?" spark line — single base.** (A `.spark` line is
      fine if it stays single-base, e.g. "Prefer cosier or a bigger view? Three to pick from.")
- [x] 2.6 **"Big hitters" cards grid:** one `.grid` of `.card` day-trip anchors (fold france's two
      grids into one — cleaner for single base). Cards: Collioure itself, Banyuls (Maillol+swim),
      Céret (Cubism), Perpignan, Port-Vendres, Cadaqués/Cap de Creus (Dalí), Argelès beach,
      optionally Figueres. Each `.card`: Wikimedia img with the **two-arg `onerror`**
      (`this.style.display='none';this.parentNode.classList.add('ph-fail')`), `.card-meta`
      ("Day trip · by train" / "by bus" / "by boat"), `.card-name`, `.card-blurb`, `.card-link`.
      **Every transport label is rail/bus/boat/foot — never car.**
- [x] 2.7 **"Good to know" `.know` 2×2:**
      (a) **Getting there on rails** — Edinburgh→London→Paris (LNER ~4h10 + Eurostar ~2h20, overnight),
          Paris→Perpignan (TGV ~5h), Perpignan→Collioure (TER ~19 min).
      (b) **Around the region** — Collioure is the hub; the Côte Vermeille TER line + liO bus 540 +
          seasonal coastal boat cover everything; **state explicitly "no car needed at any point — the
          whole coast is on the rail line, buses and a boat."**
      (c) **Eating well, meat-free** — escalivada, pa amb tomàquet, grilled veg, socca, market fruit
          (peaches/figs/melon/Céret cherries), crème catalane. (Anchovies are the local thing — note
          it's a fishing town but keep the box meat-free.)
      (d) **Heat, shade & sea** — do the walks/forts early or late, swim/pool in the midday heat, the
          sea-breeze coast is kinder than inland.
- [x] 2.8 **Footer:** mirror france's `<footer>` (a "Tempted?" big line + a paragraph + the
      "Made for Helen & Alex · summer 2026" fine print + a link back to `index.html`).

### Phase 3 — the map (`TripPresentation.init([...])`) — follow the spoke rule exactly
- [x] 3.1 Author the `stops[]` array at the bottom (research §4 has coords). **Collioure = the single
      `{ base:true, coords:[42.5263,3.0830], … }`.**
- [x] 3.2 **Edinburgh + Paris = `{ kind:"travel", … }`** (straight approach legs).
- [x] 3.3 Any **rest/beach-at-home day** at Collioure coords = `{ kind:"travel", coords:[42.5263,3.0830], … }`
      (anchor at home, no spurious arc — exactly as france.html does for its Day-5 rest day).
- [x] 3.4 Every **day-trip stop** (Banyuls, Céret, Perpignan, Port-Vendres, Cadaqués, Argelès, …) has
      **NO `kind`** → it auto-spokes. Keep `eyebrow`/`title`/`desc`/`chips` populated like france.
- [x] 3.5 Sanity-check: exactly one `base:true`; approach legs flagged travel; no day-trip wrongly
      flagged travel.

### Phase 4 — `index.html` wiring
- [x] 4.1 Add gradient rule in the `.opt-ph` block (after the `.opt--cap` line ~106):
      `.opt--collioure .opt-ph{background:linear-gradient(140deg,#b8432e,#e08a3a 50%,#1f8fa0)}`
      (tune hex if it clashes in-grid; must be visually distinct from france/spain/cap).
- [x] 4.2 Add accent rule in the `--ac` block (after the `.opt--cap` line ~229):
      `.opt--collioure{--ac:224,138,58}` (tune to match chosen gradient).
- [x] 4.3 Clone the **Option 10 (cap)** card `<a>` block → make it
      `<a class="opt opt--ready opt--collioure reveal" href="collioure.html">`, `opt-num` **"Option 11"**,
      `status status--ready` "Plan ready", Wikimedia Collioure img with `onerror`, `opt-label`
      "Collioure &amp;<br>the Côte Vermeille", `movebadge movebadge--one` "1 base", `opt-meta`
      (e.g. "A Catalan harbour, all by train"), `opt-blurb` (~12–13 days, single base, rail, no car,
      art & swims), 3 `opt-tag`s "Seaside"/"Catalan"/"Art &amp; swims", `opt-link` "See the full plan →".
      **Insert after the Option 10 card's closing `</a>`, before the grid's closing `</div>`.**
- [x] 4.4 Bump the summary copy lower in `index.html`: **"Ten plans, all ready…" → "Eleven plans…"**
      (both the `<h2>` and the surrounding sentence). Check for any other "ten"/"10 options" count.

### Phase 5 — verify
- [x] 5.1 **Playwright load check** (use the browser tool / a headless script): open `collioure.html`
      → assert **no console errors**, the Leaflet map container exists and `TripPresentation` initialises,
      "Play the journey" opens the overlay. Open `index.html` → assert the **Option 11 card is present**
      and its `href` resolves to `collioure.html`; click-through loads the page.
- [x] 5.2 **Grep gates** (must return NOTHING) on `collioure.html`:
      ```bash
      git grep -iE "wine|vineyard|tasting|aperitif|cellar|ros[eé]|sommelier" -- collioure.html
      git grep -iE "car hire|hire a car|rent a car|by car|\bdrive\b|driving" -- collioure.html
      ```
      (A bare scenery "vines" with no drink framing is tolerable but prefer none. "Drive" must not
      describe any leg.)
- [x] 5.3 **`<img>` audit:** every `<img>` in `collioure.html` has an `onerror`
      (`grep -c "<img" collioure.html` == `grep -c "onerror" collioure.html` for the img lines; cards
      use the two-arg form).
- [x] 5.4 **Size sanity:** `collioure.html` lands in the sibling band (~29–36 KB).
- [x] 5.5 Update **this plan's Deviation log** with anything that diverged, then commit research + plan
      + both HTML changes together (conventional commits). Open the PR (`Closes`/links the work),
      hand to 📇 reviewer-squirrel per `team/pr-workflow.md`.

---

## Test strategy

- **Primary (mechanical, falsifiable):** Playwright opens `collioure.html` and `index.html` headless;
  pass = zero `console.error`, `TripPresentation` defined + map node present, Option 11 card visible
  on index and links to `collioure.html`. This directly maps to spec §2 / §4 acceptance gates.
- **Content gates (grep):** the two booze/car `git grep` commands above return empty; vegetarian food
  box present; "no car" stated; every `<img>` has `onerror`. These are the spec's hard-rule gates.
- **Geometry assertion:** exactly one `base:true` in the stops array; Edinburgh+Paris carry
  `kind:"travel"`; no day-trip carries `kind:"travel"`. (Visual confirm in the Play-journey overlay:
  spokes fan from Collioure, no straight town-to-town chain.)
- **Visual/diff review:** 📇 reviewer-squirrel reviews the plan↔code delta (any deviation must be in
  the Deviation log) + 🐰 CodeRabbit + 🐝 Copilot per `team/pr-workflow.md`.
- No unit-test framework here (static site) — the "tests" are the load check + grep gates.

---

## Risks / open questions

- **R1 — Map geometry regression (HIGH if mishandled).** Forgetting `kind:"travel"` on an approach
  or rest-at-home leg makes it wrongly arc; wrongly flagging a day-trip stops it spoking. *Mitigation:*
  Phase 3 rule + 3.5 sanity check + 5.1 visual confirm. This is the one that bit the team before.
- **R2 — Accidental booze/car drift in prose (HIGH-sensitivity).** Banyuls/Collioure scream
  fortified wine; "drive over to…" is a natural phrasing. *Mitigation:* research §5 framing
  (art/swim/market) + the 5.2 grep gates are hard blockers.
- **R3 — Wikimedia hotlink 404s.** A hero/card image may die. *Mitigation:* every `<img>` has
  `onerror` (graceful), and the gradient placeholder + `.ph-label` show through; pick well-known
  Commons files (Collioure has many). `Collioure_002.jpg` is already used in-repo and works.
- **R4 — Airbnb listing dies before Helen & Alex look.** *Mitigation:* research §6 lists backup room
  ids; worst case the `.stay` still renders with its description and a Maps fallback link.
- **R5 — `index.html` grid/summary breakage.** Missing one of the two style blocks breaks hover;
  forgetting the "Ten→Eleven" bump leaves a stale count. *Mitigation:* Phase 4 covers all three edits
  explicitly.
- **Open questions:** none blocking. Implementer discretion only on the exact accent hex and folding
  france's two day-trip grids into one (recommended: one grid).

---

## Deviation log (otter fills this in as it works)

> Record any divergence from the plan here — what changed, why, and the impact. Undocumented drift is
> a review blocker (per `team/README.md` RPI convention). Empty at planning time.

- **Context-overflow recovery:** this feature was built across **three** `collioure-otter` sessions — two earlier otters hit context limits mid-build, the third (collioure-otter-3) resumed and finished. Plus a parallel otter committed `26380a2` concurrently (benign, complementary). State survived via the worktree + checkpoint commits + the project flow file, exactly as the survival rule intends.
- **Step 2.6 — one consolidated day-trip grid** (planner's recommended option): folded what would have been two grids into a single `.grid` of Côte Vermeille day-trips (Banyuls, Céret, Perpignan, Port-Vendres, Cadaqués, Argèles, Figueres) since this is a single-base page. Approved in the plan's open-questions.
- **At-base days flagged `kind:"travel"`:** Day 3 "Collioure in full" and Day 11 "Collioure encore" anchor at the base coords `[42.5263,3.0830]` with `kind:"travel"` so they do not generate degenerate self-spokes (commit `26380a2`). This is the france.html rest-day pattern; total `kind:"travel"` = 5, `base:true` = 1.
- **Getting-there time:** the rail box says LNER **~4h20** (sibling-page phrasing) rather than the research memo's ~4h10 — both are indicative; left as-authored to avoid churn. Not a gate item.
- **Index hero image URL:** Option 11 card reuses the in-repo-proven `commons/1/14/Collioure_002.jpg` (same file collioure.html's hero uses) rather than guessing a path.
- **Verification tooling:** the `browser` tool blocks `file://` and even localhost navigation by policy, so Phase D was verified via the **puppeteer MCP** driving system Chromium against the worktree served on `127.0.0.1:5599`. Screenshots saved to `/tmp/collioure-{map,spoke,card}-verify.png`. All gates pass (13 markers/13 stops, spoke arc confirmed at Banyuls step, no console errors, grep gate empty, 11/11 imgs have onerror).
