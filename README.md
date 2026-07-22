# NoodleFan 粉面王 — Profit Simulator

A single-page, no-build web app for modeling the economics of running **NoodleFan**
(Boston Chinese noodle/rice-noodle restaurant) out of a **CloudKitchens** ghost-kitchen
unit — delivery and pickup only, no dine-in.

Live demo: https://lukchen.github.io/noodlefan-profit-simulator/

## What it models

- **Order volume** — orders/day, days open/week, average order value (AOV)
- **Channel mix** — % of orders via Direct Pickup, DoorDash, Uber Eats, Fantuan (饭团), each
  with its own commission rate
- **Kitchen rent & utilities** — CloudKitchens monthly rent + CAM/utilities
- **Food cost (COGS)** — as a % of revenue
- **Packaging** — cost per order
- **Labor** — staff count × hourly wage × hours/week (treated as a fixed monthly cost)
- **Marketing/promo** — fixed monthly spend
- **One-time startup costs** — equipment, permits, initial inventory, smallwares,
  optionally amortized into the monthly P&L over N months

It outputs a monthly P&L, net margin, break-even orders/day, a cost-breakdown chart,
and a profit-vs-volume sensitivity chart. Every number is editable; the scenario
auto-saves to your browser's local storage.

## Default assumptions (edit these — they're estimates, not quotes)

- CloudKitchens doesn't publish list pricing for its Boston (Shirley St) location —
  rent/utilities defaults are rough placeholders. Get an actual quote and replace them.
- Delivery commission defaults are set per channel in the app (DoorDash / Uber Eats /
  Fantuan 饭团; Direct Pickup 0%). Your actual contracted rate may differ — update per channel.
- Per-dish sell prices and food costs come from the Drive 菜品定价 / 成本 sheets (not a
  flat %); packaging is costed per order. Update these from the current sheets.

## Running locally

No build step — just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Deploying to GitHub Pages

```bash
# from inside this folder
gh repo create noodlefan-profit-simulator --public --source=. --remote=origin --push

# then enable Pages (root of main branch)
gh api -X POST repos/:owner/noodlefan-profit-simulator/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

Your site will be live at `https://<your-username>.github.io/noodlefan-profit-simulator/`
within a minute or two. If `gh api` for Pages fails (some accounts need it enabled via
the web UI instead), go to **Settings → Pages** on the repo and set Source = `main` / `/ (root)`.

## Files

- `index.html` — structure/inputs
- `style.css` — styling
- `app.js` — all calculation logic + charts (Chart.js via CDN)
