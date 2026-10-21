# 🍞 Sourdough Companion

[![Deploy to GitHub Pages](https://github.com/fj9/sourdough/actions/workflows/deploy.yml/badge.svg)](https://github.com/fj9/sourdough/actions/workflows/deploy.yml)

A free, mobile-friendly web app that walks you through a weekly sourdough bake, plans the whole thing backwards from when you want to start, and keeps a log of how each loaf turned out. It installs to your phone's home screen, works offline, and keeps everything on your own device.

**Use it:** https://fj9.github.io/sourdough/

**Made by** [fj9](https://github.com/fj9) · [LinkedIn](https://www.linkedin.com/in/frankiej9/) · [Ko-fi](https://ko-fi.com/fjnine) (optional, and everything stays free either way)

## Contents

- [What it does](#what-it-does)
- [The bake](#the-bake)
- [How the planning works](#how-the-planning-works)
- [Using it](#using-it)
- [Your data and privacy](#your-data-and-privacy)
- [Development](#development)
- [Architecture](#architecture)
- [Changing things](#changing-things)
- [Testing](#testing)
- [Deployment](#deployment)
- [Known limits](#known-limits)
- [Ideas for later](#ideas-for-later)
- [Credits and licence](#credits-and-licence)

## What it does

- **Guides a bake step by step.** Ten steps from feeding the starter to the oven, each with instructions, ingredient amounts, and a timer where the step has one.
- **Plans backwards.** Tell it when you're feeding, or when you want to start your autolyse, and it works out the feed, when the starter will be ready, and a full timeline of when each step happens.
- **Shows how long until the next step**, so you know when you can walk away.
- **Scales the recipe** for one or two loaves, regular (25cm banneton, about 1kg) or large (30cm, about 1.5kg), at a hydration you choose from 60% to 80%.
- **Keeps your place.** The bake in progress is saved, so a reload or a locked phone doesn't lose it, and timers keep counting with the screen off.
- **Logs your bakes** with outcome, notes and the timings you recorded, and lets you repeat any past bake.
- **Is easy to follow.** Plain-English tips on every step and tricky term, sensible defaults, a first-run tutorial, a text size setting and a Help tab.
- **Works offline** and installs as an app (a progressive web app), with light ("tea towel") and dark ("ember") themes.

## The bake

The method is one weekly workflow: a white-flour loaf with a little honey and olive oil, mixed in stages, proved in a banneton, retarded in the fridge and baked from cold in a Dutch oven.

| # | Step | What happens |
| --- | --- | --- |
| 1 | Feed the starter | Feed in the evening (or morning) so it is active when you need it. A calculator works out the feed and the timing |
| 2 | Autolyse | Mix flour and water and rest, 30 to 60 minutes (default 1 hour) |
| 3 | Fermentolyse | Add the active starter, rest 30 to 60 minutes. This is when bulk fermentation starts |
| 4 | Add salt and enrichments | Salt, honey and olive oil, then rest 30 minutes |
| 5 | Bulk fermentation: folds | Four sets of stretch and folds, 30 minutes apart (add any inclusions during fold 4) |
| 6 | Continue bulk | Leave until the target rise. A temperature table gives the time and rise to aim for |
| 7 | Pre-shape | Loose round, then a 30 minute bench rest |
| 8 | Final shape | Shape and place in the banneton |
| 9 | Cold retardation | 8 to 72 hours in the fridge. A planner gives the bake time |
| 10 | Baking | 240°C with the lid on, then 230°C with the lid off. Times depend on the loaf size |

### Recipe

Flour and starter are fixed per loaf. The hydration you choose changes only the water, and the starter counts as half flour and half water when working out hydration. Water is rounded to a tidy number (a round 50g if the exact amount is within 10g, otherwise the nearest 5g).

| Loaf | Flour | Starter | Water at 70% | Salt | Honey | Olive oil |
| --- | --- | --- | --- | --- | --- | --- |
| Regular (25cm banneton, about 1kg) | 450g | 150g | 300g | 10g | 15g | 20g |
| Large (30cm banneton, about 1.5kg) | 600g | 200g | 400g | 13g | 20g | 27g |

Two loaves double everything. The starter calculator also adds 30g to keep back in the jar for next time, so one large loaf needs 230g of starter in total (two need 430g).

| Loaf | Lid on at 240°C | Lid off at 230°C | Total |
| --- | --- | --- | --- |
| Regular | 20 minutes | 20 to 25 minutes | 40 to 45 minutes |
| Large | 25 minutes | 25 minutes | 50 minutes |

## How the planning works

### The starter calculator (step 1)

It uses a chart of ten standard feeds, written as starter : flour : water by weight, from 1:1:1 (ready in 4 to 6 hours) to 1:10:10 (13 to 16 hours), at a kitchen temperature of about 21 to 22°C. The chart is the list at the top of `src/feeding.js`. A feed amount is whole grams of your starter, plus the same weight of flour and water, rounded up so you never make less than you need.

There are two modes, plus a shortcut:

- **Simple** (the default). You say when you're feeding. It gives a standard 1:6:6 feed using only as much of your starter as it needs, when it will be ready, and when to start your autolyse. If that lands in the middle of the night (23:00 to 06:00) a note points you to Advanced.
- **Advanced.** You pick when you want to start autolyse (6, 7 or 8 am, 1, 2 or 3 pm, or anything on the slider) and it lists the feed times that suit it, each with its ratio, for example "10 pm 1:6:6" or "8 pm 1:9:9". It starts on the latest 1:6:6 feed and only offers times between 6 am and 10 pm. "Pick another time" opens the full picker. The starter amounts (100g in your jar, and what the loaf needs) sit in a closed box you can open and change.
- **Already fed?** A link under the calculator. Enter when you fed and which feed you used, and it works out when the starter will be ready.

The result always leads with a plain sentence ("Feed your starter at 10:00 pm. Mix 14g of your starter with 84g flour and 84g water..."). A "See how this works" section holds a bar showing the feed, the ready window and when the starter goes in, and (in Advanced) how every ratio fits.

The starter goes into the dough when the autolyse rest ends, so that is how long it has to rise. A ratio fits when that wait is inside its rise window. 1:6:6 is preferred; otherwise the ratio whose window is centred closest to the wait is chosen.

### The timeline

Once a feed is worked out, a **Your timeline** panel under the progress bar lists when every step happens: autolyse, adding the starter, salt, the folds, the end of bulk, shaping, the fridge, oven on, bake and loaf out, with the free time between them. Its summary line says how long until the next step, for example "next: Start autolyse Mon 8:00 am · in 3h 20m".

It is built from these defaults, all adjustable in the panel:

- A 24°C dough (the bulk time and target rise come from a temperature table).
- A morning bake at 8:00 am, at least 8 hours in the fridge and at most 72.
- Autolyse and fermentolyse lengths from the steps, a 30 minute salt rest, four folds 30 minutes apart, a 30 minute pre-shape rest, 15 minutes to shape, and the oven on 45 minutes before baking.

The plan follows what really happens. If you record the actual time you added the starter or finished bulk, the rest of the timeline moves to match.

### Rest lengths

Autolyse and fermentolyse can each be set from 30 to 60 minutes. A button suggests the longest rest that ends on the hour or half hour if you start now, so the next steps land on tidy clock times.

### Choosing times

Every time is picked with the same control: quick-pick buttons, a large readout and a slider. Feed and autolyse use 15 minute steps. Recording something that just happened uses 5 minute steps and buttons like "15 min ago". Times show as "7:30 am" by default, with a 24-hour option in Settings. Stored times are always 24-hour `HH:MM`; only the display changes.

## Using it

**On your phone:** open the link above and use your browser's "Add to Home Screen" (iPhone: Share, then Add to Home Screen) or "Install". It then works like an app, including offline once it has loaded once. When a new version is ready it asks you to reload.

**First time:** four welcome cards explain the app. They can be shown again from Help.

**Tabs:**

- **Bake:** the guided steps. Tapping Bake while you are mid-bake asks if you want to go back to the start.
- **Log:** every bake you have logged, each with a **Repeat this bake** button.
- **Settings:** theme (light, dark or follow your phone), text size (normal, large, larger), show or hide the help hints, 12 or 24-hour clock, timer notifications, and back up or restore your log.
- **Help:** getting started, questions and answers, and a link to About.

**Keeping your place.** The bake in progress is saved every few seconds and whenever the page is hidden. The start screen then offers **Resume your bake** or Start fresh. Timers count down to a saved end time, so they stay right with the screen off, and if one finished while you were away you are told. The last loaves, size, hydration, mode and starter amount are remembered for next time.

## Your data and privacy

There is no backend, no account and no analytics. Everything lives in your browser's local storage on your own device and never leaves it.

| Key | What it holds |
| --- | --- |
| `sourdoughLogs` | Your logged bakes (a JSON list). This is what Back up and Restore in Settings save and load |
| `sourdoughActiveBake` | The bake in progress, so it can be resumed |
| `sourdoughSettings` | Clock, text size, hints, welcome seen, and the last choices |
| `sourdoughTheme` | Light, dark or system |

Clearing your browser's site data deletes all of these, so use **Back up** (Settings) first if you want to keep your log.

## Development

Vite, plain JavaScript (ES modules), Vitest and `vite-plugin-pwa`. There is no framework. Node 22 or later is recommended.

```bash
npm install
npm run dev       # dev server with hot reload
npm test          # unit tests (Vitest)
npm run build     # production build into dist/
npm run preview   # serve the production build, including the service worker
npm run icons     # re-render the PNG icons from public/favicon.svg
```

The service worker is only generated by `npm run build`, so use `npm run preview` (not `npm run dev`) to try the offline behaviour.

## Architecture

```text
index.html           page shell: tabs, static panels, theme and text-size bootstrap script
src/main.js          entry: imports the CSS, the bundled heading font, app.js and shell.js
src/app.js           the baking workflow: steps, timers, calculators, timeline, bake log
src/shell.js         everything around it: theme, tutorial, settings, help, about, footer, update prompt
src/styles.css       all styling; the two themes are CSS variables at the top

Pure modules (no DOM, covered by tests)
src/recipe.js        loaf sizes, hydration, ingredient amounts, bake times
src/feeding.js       the feeding chart and the calculators: simple, from-autolyse, already-fed, feed-time options
src/schedule.js      the whole-bake plan from a feed time, and the bulk temperature table
src/timing.js        autolyse and fermentolyse rest lengths and the tidy-time suggestion
src/clock.js         12 or 24-hour display of "HH:MM" times
src/persist.js       saving the bake in progress, and the timer that survives a locked screen
src/settings.js      remembered settings and display settings
src/feedbar.js       HTML for the feed bar (ready window)
src/timeline.js      HTML for the timeline, countdown text
src/timepicker.js    HTML and wiring for the quick-pick time picker
src/tips.js          the plain-English tooltip text

public/              favicon and app icons
scripts/             make-icons.mjs
.github/workflows/   deploy.yml
```

How it fits together:

- **One state object.** `currentBake` in `src/app.js` holds the bake in progress (loaves, size, hydration, chosen times, recorded times, the timer). It is plain JSON, which is what makes saving and resuming it simple.
- **Pure logic, thin UI.** Anything that calculates (amounts, plans, schedules, formatting) lives in a pure module with tests. `app.js` reads inputs, calls those functions and writes HTML strings into the page. HTML-building helpers that need no DOM (`feedbar.js`, `timeline.js`, `timepicker.js`) are pure too, so they are tested as strings.
- **Times.** Stored and calculated as 24-hour `"HH:MM"` strings, with day offsets worked out by `clockAfter` and friends in `feeding.js`. Dates use local time. `fmtTime` is the only place that decides how they are shown.
- **Theme and display.** CSS custom properties at the top of `styles.css`. `data-theme`, `data-text` and `data-hints` on the root element switch the theme, text size and hints. Font sizes are written as `calc(Npx * var(--ts, 1))` so the text size setting scales them.
- **Offline.** `vite-plugin-pwa` generates the manifest and a service worker (`registerType: 'prompt'`). `shell.js` registers it and shows a reload prompt when a new version is ready. The heading font is bundled, so nothing is fetched from elsewhere.

## Changing things

| To change | Edit |
| --- | --- |
| The feeding chart (rise times, which ratios exist) | `FEEDING_RATIOS` at the top of `src/feeding.js` |
| Loaf sizes, flour, starter, salt, honey, oil | `LOAF_SIZES` and `EXTRAS` in `src/recipe.js` |
| Hydration choices and water rounding | `HYDRATIONS`, `WATER_*` in `src/recipe.js` |
| Bake times and temperatures | `BAKE_TIMES` and `bakePlan` in `src/recipe.js` |
| Bulk fermentation time by dough temperature | `BULK_FERMENTATION_TEMPS` in `src/schedule.js` |
| Timeline assumptions (salt rest, folds, preheat, fridge limits, defaults) | `PLAN_DEFAULTS` in `src/schedule.js` |
| The hours counted as "middle of the night" | `AWKWARD_FROM` and `AWKWARD_TO` in `src/feeding.js` |
| The words in tooltips | `src/tips.js` |
| Welcome cards, questions and answers | `WELCOME_CARDS` and `FAQ` in `src/shell.js` |
| About page | the `about-tab` section in `index.html` |
| Footer links | `FOOTER_LINKS` in `src/shell.js` |
| Colours | the CSS variables at the top of `src/styles.css` |
| Quick-pick times | `FEED_CHIPS`, `AUTOLYSE_CHIPS`, `BAKE_CHIPS` in `src/timepicker.js` |

If you change recipe numbers or the chart, run `npm test`: several tests state the expected amounts, so they will tell you what moved.

## Testing

```bash
npm test
```

Vitest runs every `src/*.test.js`. The tests cover the recipe amounts, the feeding chart and calculators, the schedule and timeline, rest lengths, time formatting and the pickers, saving and resuming, and settings. There is no browser test suite: the DOM wiring in `app.js` and `shell.js` is checked by hand in a browser. The deploy workflow runs the tests before building, so a failing test blocks a release.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`: it installs dependencies, runs the tests, builds, and publishes `dist/` to GitHub Pages. To set it up on a fork, go to **Settings, then Pages** and set **Source** to **GitHub Actions**. The build uses relative paths (`base: './'`), so it works under `https://<user>.github.io/<repo>/`.

## Known limits

- **Everything is an estimate.** Rise times assume a kitchen around 21 to 22°C, and bulk times assume the dough temperature you give. Warm or cool kitchens change them, so go by how the dough looks and feels.
- **One recipe.** The method and quantities are one fixed recipe (see above). Other recipes would need the numbers in `src/recipe.js` changed.
- **Timers cannot ring when the app is closed.** A web app can't reliably alert you from the background. Timers stay accurate and are right when you come back, and notifications work while the page is open. A calendar export would be the way to get real reminders.
- **One bake at a time**, and no accounts or syncing between devices (use Back up and Restore to move a log).
- **Metric only** (grams and °C).

## Ideas for later

- Export the timeline to a calendar file with an alert for each step.
- Share the plan as text.
- Plus and minus buttons on the time sliders for fine adjustment.

## Credits and licence

- The recipe began with a sourdough guide tea towel by [Stuart Gardiner](https://www.stuartgardiner.com), and the look of the app borrows its colours. This project is not affiliated with or endorsed by him.
- Heading font: [Alfa Slab One](https://fontsource.org/fonts/alfa-slab-one) (SIL Open Font Licence), bundled with `@fontsource`.
- Built with [Vite](https://vitejs.dev), [Vitest](https://vitest.dev) and [vite-plugin-pwa](https://vite-pwa-org.netlify.app).

No licence has been chosen yet, so all rights are reserved by default. You're welcome to read the code and get in touch.
