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
src/schedule.js the whole-bake plan: when each step happens, from your feed time
src/timeline.js the timeline shown under the progress bar
src/timing.js   autolyse and fermentolyse rest lengths (30-60 min) and the tidy-time suggestion
src/tips.js     plain-English tooltip text for the jargon (edit the wording here)
src/app.js      the baking workflow, timers, calculators and bake log
src/shell.js    theme, welcome cards, settings, help, footer, update prompt
public/         favicon and app icons
```

## Hosting on GitHub Pages

`.github/workflows/deploy.yml` runs the tests, builds and deploys `dist/` on every push to `main`. In the repository settings, set Pages > Source to "GitHub Actions". The build uses relative paths, so it works under `https://<user>.github.io/<repo>/`.

## Feeding your starter

Step 1 has a starter calculator with two modes, using a chart of ten standard feeds (1:1:1 to 1:10:10) and their rise times at about 21-22°C. The chart is the list at the top of `src/feeding.js`.

- **Simple** (the default): tell it when you're feeding. It gives a standard feed (1:6:6) using only as much of your starter as it needs, when it will be ready, and when to start your autolyse. If that lands in the middle of the night (23:00 to 06:00) a note points you to Advanced.
- **Advanced:** two sliders, when you want to start autolyse and when you're feeding. It picks the feed that has your starter ready in time, 1:6:6 if it fits, and updates live. The starter amounts (100g in your jar, 180g needed) are tucked into a closed box you can open and change. If no feed can fit, it says when to feed by or from.
- **Already fed?** a link under the calculator: enter when you fed and which feed you used, and it works out when the starter will be ready.

The answer comes first, in plain words, with "See how this works" underneath for the bar showing the feed, the ready window and when the starter goes in, and (in Advanced) how every feed fits.

The next step then suggests your autolyse time from the feed you planned (an hour before the starter's earliest rise time).

## Autolyse and fermentolyse length

Both rests default to 1 hour but can be set anywhere from 30 to 60 minutes. A button suggests the longest rest that ends on the hour or half hour if you start now (for example, starting at 10:20 suggests 40 minutes, ending at 11:00) so the steps after it land on tidy times. The timer, the suggested autolyse start, the fold times and the remaining bulk time all follow the length you choose.

## Your timeline

Until you've worked out your feed (or told the app when you fed) the timeline is just one quiet line under the progress bar. After that a **Your timeline** panel under the progress bar lists when each step happens: autolyse, adding the starter, salt, the folds, the end of bulk, shaping, the fridge, oven on, bake and loaf out, with the free time between them. It assumes a 24°C dough and a morning bake at 08:00, and you can change the feed time, dough temperature, bake time and extra fridge days in the panel. Rest lengths come from the steps, and the plan moves if you record your real start and end times. Tapping **Bake** while you are mid-bake asks if you want to go back to the beginning.

## Look and feel

The style comes from a sourdough tea towel: **light mode** is cream with terracotta and rust red, slab-serif headings, double rules and a polka-dot border; **dark mode** (called ember) is warm brown with ember orange. The colours are CSS variables at the top of `src/styles.css`, and the heading font (Alfa Slab One) is bundled so it works offline.

## Made easy to follow

Every step title and the tricky terms (feeding ratio, dough temperature, target rise and so on) have a small (i) button. Hover over it, tab to it, or tap it to see a plain-English explanation; tap away to close it.

Inputs start with sensible values: 100g of starter in the jar, autolyse at 08:00, and a dough temperature of 24°C. Anyone without a thermometer can tap Cool kitchen (21°C), Typical (24°C) or Warm kitchen (26°C) to get the bulk fermentation time straight away.

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
10. **Baking** (240°C → 230°C; 40-45 min total for a regular loaf, 50 min for a large)

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
