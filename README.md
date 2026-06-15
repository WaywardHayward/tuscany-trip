# Summer 2026 — where shall we go? 🌍

A little site for Helen & Alex weighing up where to spend the summer holiday. The landing page (`index.html`) is a shortlist of options; each option gets its own self-contained page.

- **`index.html`** — the shortlist: Tuscany, Naples & Pompeii, and somewhere in Spain.
- **`tuscany.html`** — Option 1, fully planned: a restful, train-based fortnight around a hidden garden base in the hills above Lucca, with garden villas, Florence, hill towns, and an optional Val d'Orcia finale.
- Naples & Pompeii and Spain are placeholders for now, ready to flesh out into their own pages.

No build step, no dependencies — each page is a single self-contained HTML file. Just host it.

## Publish it to GitHub Pages

### Option A — no terminal (easiest)
1. Go to **github.com → New repository**. Name it something like `tuscany-trip`. Make it **Public**. Don't add anything else.
2. On the new repo page, click **uploading an existing file** and drag in `index.html`, `tuscany.html` (and `.nojekyll` if you have it). Commit.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: `main` / `(root)`**, Save.
5. Wait ~1 minute. Your site is live at:
   `https://<your-username>.github.io/tuscany-trip/`

### Option B — terminal
```bash
git init
git add index.html tuscany.html .nojekyll README.md
git commit -m "Summer 2026 trip site"
git branch -M main
# create the repo first on github.com, then:
git remote add origin https://github.com/<your-username>/tuscany-trip.git
git push -u origin main
```
Then enable Pages via **Settings → Pages** as in steps 3–5 above.
(Or, with the GitHub CLI: `gh repo create tuscany-trip --public --source=. --push` then enable Pages.)

## Swapping in your own photos
The destination photos are hotlinked from Google's image CDN, so they need an internet connection to show and could change over time. To make it bulletproof or to use your own snaps:
1. Add an `images/` folder to the repo with your photos.
2. In `index.html`, find the `src="https://lh3..."` links and point them at `images/your-photo.jpg`.
3. Commit and push. Pages redeploys automatically.

## Adding the other options
Naples & Pompeii and Spain are placeholder cards on `index.html` (marked **In planning**). When you're ready, copy `tuscany.html` to e.g. `naples.html`, rewrite the content, then point that option card's `<div class="opt opt--soon ...">` at the new page (turn it into an `<a href="naples.html">`, swap the status chip to **Plan ready**, and give it the `opt--ready` class).

## Tweaks
The whole thing is plain HTML and CSS, one file per page. On the Tuscany page, day text lives in the timeline `<li>` blocks and the practical notes are near the bottom. On the landing page, the option cards live in the `.options` grid. Easy to edit by hand.
