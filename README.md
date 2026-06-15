# Tuscany — a slow green fortnight 🌿

A one-page trip site for Helen & Alex: a restful, train-based fortnight built around a hidden garden base in the hills above Lucca, with garden villas, Florence, hill towns, and an optional Val d'Orcia finale.

It's a single self-contained `index.html` — no build step, no dependencies. Just host it.

## Publish it to GitHub Pages

### Option A — no terminal (easiest)
1. Go to **github.com → New repository**. Name it something like `tuscany-trip`. Make it **Public**. Don't add anything else.
2. On the new repo page, click **uploading an existing file** and drag in `index.html` (and `.nojekyll` if you have it). Commit.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: `main` / `(root)`**, Save.
5. Wait ~1 minute. Your site is live at:
   `https://<your-username>.github.io/tuscany-trip/`

### Option B — terminal
```bash
git init
git add index.html .nojekyll README.md
git commit -m "Tuscany trip site"
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

## Tweaks
The whole thing is plain HTML and CSS in one file. Day text lives in the timeline `<li>` blocks; the practical notes are near the bottom. Easy to edit by hand.
