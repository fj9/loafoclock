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

Open https://fj9.github.io/sourdough/ on your phone or computer. Use your browser's "Add to Home Screen" / "Install" option and it works like an app, including offline once it has loaded once. When a new version is available it asks you to reload.

## Development

Vite, plain JavaScript, Vitest and `vite-plugin-pwa`.

```bash
npm install
npm run dev      # dev server
npm test         # recipe maths (src/recipe.test.js)
npm run build    # production build into dist/
npm run icons    # re-render the PNG icons from public/favicon.svg
```

```text
src/recipe.js   loaf sizes, hydration and ingredient amounts
src/feeding.js  starter feeding ratios, rise times and the two feed calculators
src/app.js      the baking workflow, timers, calculators and bake log
src/shell.js    theme, welcome cards, settings, help, footer, update prompt
public/         favicon and app icons
```

## Hosting on GitHub Pages

`.github/workflows/deploy.yml` runs the tests, builds and deploys `dist/` on every push to `main`. In the repository settings, set Pages > Source to "GitHub Actions". The build uses relative paths, so it works under `https://<user>.github.io/<repo>/`.

## Feeding your starter

Step 1 has two calculators, using the rise times from Kanika's Cooking Class starter feeding chart (21-27°C):

- **Limited starter:** enter the starter you have, the amount you need and your feed time. It feeds at 1:6:6 using only as much of your starter as it needs, and shows when it should be ready (10-14 hrs). If you don't have enough for 1:6:6 it dilutes to 1:10:10, and says so if even that isn't enough.
- **Deadline:** enter when you need the starter and when you'll feed. It suggests the richest ratio whose rise time fits, and how much starter, flour and water to use.

Either way it suggests when to start the autolyse (an hour before the earliest rise time).

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
