# 🍞 Sourdough Companion

A mobile-friendly web app to guide you through sourdough baking and track your bakes.

## Features

- **Active Baking Mode**: Step-by-step guide through your sourdough workflow
- **Built-in Timers**: Automatic timers for autolyse, fermentolyse, and folds
- **Scalable Recipes**: Automatically adjusts ingredients for 1 or 2 loaves
- **Bake Logging**: Track variations, temperatures, and outcomes
- **Offline Support**: Works without internet once loaded
- **Mobile-Friendly**: Responsive design for phone, tablet, or desktop
- **Light and dark mode**: choose in Settings, or follow your phone
- **First-run welcome cards**, a Help tab, and back up / restore for your bake log

## How to Use

### Option 1: Open Locally
1. Simply open `index.html` in any web browser
2. Works on desktop, tablet, or phone

### Option 2: GitHub Pages
Pushing to `main` deploys the site via `.github/workflows/deploy.yml`.
In the repo, set **Settings → Pages → Source** to **GitHub Actions** (one-off).

## Your Sourdough Method

The app follows your weekly workflow:

1. **Feed Starter** (evening, 8-10 hours)
2. **Autolyse** (1 hour)
3. **Fermentolyse** (1 hour)
4. **Add Salt & Enrichments**
5. **Bulk Fermentation with 4 Folds** (30 min intervals)
6. **Continue Bulk** (until doubled, 2+ hours)
7. **Pre-Shape** (30 min bench rest)
8. **Final Shape**
9. **Cold Retardation** (8-72 hours)
10. **Baking** (240°C → 230°C, 50 min total)

## Recipe

Flour and starter are fixed per loaf; the hydration you choose (60-80%, default 70%) only changes the water. Hydration counts the starter as half flour, half water, and water is rounded to a tidy number (a round 50g when within 10g, otherwise the nearest 5g).

| Loaf | Flour | Starter | Water at 70% |
| --- | --- | --- | --- |
| Regular (25cm banneton, ~1kg) | 450g | 150g | 300g |
| Large (30cm banneton, ~1.5kg) | 600g | 200g | 400g |

Salt, honey and olive oil are 10g, 15g and 20g for a regular loaf, and the same proportion of the flour for a large one (13g, 20g and 27g). Two loaves double everything.

## Tips for Your Mum

- The app guides through each step with clear instructions
- Timers automatically count down for timed steps
- All ingredient amounts adjust based on number of loaves
- Bake history helps track what works best
- Works on any phone or tablet - just bookmark the page!

## Browser Notifications

The app can send notifications when timers complete. Allow notifications when prompted for the best experience.

## Data Storage

All bake logs are stored locally in your browser. Your data never leaves your device.

---

Happy baking! 🍞
