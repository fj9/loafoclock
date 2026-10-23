# Loaf O'Clock v2: build plan

A timeline-first sourdough planner. This document records what we decided and how we will build it. It is the starting point for the new repository, which began as a copy of the first app (`fj9/sourdough`, which stays as it is).

## The idea

Most sourdough apps quietly adjust the schedule for you. Loaf O'Clock shows you the levers (feed, dough temperature, time in the fridge) and what each one does to your day, as one multi-day timeline from the first feed to a loaf that is **ready to carve**.

## Version 1 scope

In: two planning options, a locked live view, a log, and the basics (settings, About, Help).
Out for now: reminders, accounts and syncing, other recipes, and two loaves with different cold-ferment times.

## Decisions so far

### Planning
- **The timeline starts at the first feed.** The starter comes straight from the fridge: no warm-up and no pre-feeds.
- **Two ways in:**
  1. **Start a loaf now.** Shows the range of possible carve times, starts on levers that fit your waking hours, and lets you tweak them. "Fastest" is genuinely the fastest (see below).
  2. **I want bread at...** Pick a day and a time and the app works backwards.
- **Carve-time picker.** Day chips (Today, Tomorrow, then the next weekdays), meal chips, and a slider.
  - Meals: Breakfast 8:00 am, Late breakfast 10:30 am, Lunch 12:30 pm, Tea 4:00 pm, Supper 8:30 pm.
  - Slider: 6:00 am to 11:30 pm in 15 minute steps. A chip lights up when the slider sits on it.
- **The fastest bake:** shortest feed (1:1:1), warmest dough (26 to 27°C), the 8 hour minimum in the fridge, and the shortest cooling. About 19 h 45 m from first feed to ready to carve (with 45 minute cooling).
- **The secret unlock: no fridge.** Skip the cold retard and bake about 2 to 3 hours after shaping. It saves a lot of time (about 13 h 45 m in total) but is less sourdough, and the app says so. Shown as a quiet unlock under the fridge lever.
- **The fridge** is 8 to 72 hours if used, or skipped with the unlock.

### Rules the plan must follow
- **Waking hours: 6:00 am to 11:00 pm.** Every moment that needs you must fall inside them: feeding, autolyse, adding the starter, salt, the folds, shaping, into the fridge, oven on, bake and loaf out. Shaping at 10:30 pm is fine. Starting an autolyse at 10:30 pm is not, because the folds that follow would land in the night. The planner works the latest sensible start out from this rule.
- **Carving is exempt.** A loaf can come out at bedtime and be carved in the morning.
- **Rest before carving is at most 16 hours.**
- **Bulk fermentation is counted from the moment the starter goes in** (the fermentolyse). Salt and the folds happen inside it. A late fold moves the later folds but not the end of bulk.
- **The feed windows are the app's current chart** (`FEEDING_RATIOS` in `src/feeding.js`). That data is correct: for example 1:6:6 is ready 9 to 11 hours after feeding, 1:1:1 in 4 to 6 hours, 1:10:10 in 13 to 16 hours.
- **Cooling before ready to carve:** a choice of 30 or 60 minutes, defaulting to 60 (confirmed).
- **Two loaves** are baked together for now. Two loaves with different cold-ferment times (one less sour, one more) is a good idea for later.
- **The feed windows in the app are correct** and are the source of truth. Any other numbers mentioned in conversation were guesses.

### Healthy starter
- A warning when a quick feed (1:3:3 or quicker) is chosen: quick feeds are fine now and then to hurry a bake, but for a weekly starter kept in the fridge a steadier routine of 1:6:6, with an occasional 1:9:9, is gentler.
- A "Keeping a healthy starter" FAQ.
- The log records the feed ratio used. The app can nudge after several quick feeds in a row (suggested: 3).
- Wording is chosen by the builder, kept modest and framed as a rule of thumb, because it is guidance rather than a measured fact. Written in milestone 6.

### Live view (after you lock a plan)
- A **Now** marker on a horizontal timeline, a "Next up" card with a countdown, and a "you are free for..." card.
- **Every tick is a deliberate tap.** Nothing completes by itself.
- **Each of the four folds is its own tick**, with four dots in the Next up card.
- **"When did you do this?"** at the autolyse and when the starter goes in (Just now, 10 min ago, and so on). Actual times re-anchor the rest of the plan.
- **If you are late,** the app offers to keep your bake time by taking the lateness off the fridge time, down to the 8 hour minimum.
- **Unlock to edit.** After locking you can still change the levers that have not happened yet: mainly the fridge time, plus carve time and dough temperature (until bulk is over). The feed ratio locks once the feed has happened.

## Stack

Vite, Preact, TypeScript, Vitest and `vite-plugin-pwa`. The pure logic moves to TypeScript with its tests.

## What carries over from the first app

| Current module | In v2 |
| --- | --- |
| `clock`, `timing`, `recipe`, `settings`, `tips` | Keep, port to TypeScript. Storage keys use a `loafoclock` prefix |
| `feeding` (chart, ratio fit, feed amounts) | Keep and extend with quick-feed flags |
| `schedule`, `timeline`, `feedbar` | Rewrite on the new plan model |
| `persist` (saved bake, end-time timers) | Keep the idea. The saved record becomes plan plus actual times |
| `timepicker` | Keep the maths, rebuild as components, add the carve-time picker |
| `app.js`, `shell.js` | Replaced by screens and components. Reuse the step instructions content |

## The plan model (the core)

- A chain of steps with durations, anchored to **real timestamps**, not clock times. A confirmed actual time fixes that step and re-times what follows.
- **Forward planner:** levers in, plan out.
- **Backward planner:** carve time in, candidate plans out (a fresh bake, a bedtime bake, and a more-flavour variant), flagging quick feeds. Searches feed times in half-hour steps and bake times in quarter-hour steps.
- **Live reconcile:** plan plus ticks plus now gives what is done, due or overdue, the shifts, "keep my bake time", the free-time gap and countdowns.
- **Fit hints:** which lever settings keep everything inside waking hours, and a "nudge" for the fridge.
- All of it is pure code covered by tests, with no screens needed.

### Clocks changing
If you are in the UK the clocks go back on **Sunday 25 October 2026**. The first app adds clock hours, so a plan across that weekend would be an hour out. The new model stores timestamps, checks waking hours in local time, and has tests for a clocks-change weekend.

## Milestones

| # | Milestone | Done when | Size |
| --- | --- | --- | --- |
| 0 | Set-up | TypeScript and Preact in place, CI and Pages working, existing tests passing | S |
| 1 | Plan model | Forward and backward planners and live reconcile tested, including a clocks-change weekend | L |
| 2 | Timeline and Start now | Horizontal bar, levers, tick hints, nudge, no-fridge unlock, range line | M |
| 3 | Bread at... | Day, meal chips and slider, plan cards, same levers underneath | M |
| 4 | Live view | Lock, now marker, countdowns, deliberate ticks, four fold ticks, confirm-time prompts, edit levers, resume | L |
| 5 | Steps | "Open the step" shows instructions, amounts and timers | M |
| 6 | Log and the rest | Log (with feed ratio), Repeat, optional import of old logs, settings, About, Help, FAQ | M |
| 7 | Polish | Accessibility, contrast, text sizes, offline, mobile checks on a real phone | M |

Review points with the owner after milestones 2, 3 and 4.

## Testing

- Unit tests for the model, including properties that must always hold: every plan the backward planner returns, run forward, lands on the carve time; no moment that needs you falls in sleeping hours; bulk always counts from the starter going in; the fridge is never below 8 hours unless skipped.
- Component tests for the carve picker, fold ticks and confirm sheet.
- A few end-to-end checks (plan, lock, tick, reload, resume), and checks on a narrow phone in both themes and all text sizes.
- The service worker and update prompt need checking by hand on a real device.

## Storage

- Keys use a `loafoclock` prefix, because browser storage is shared across `fj9.github.io` and must never read the first app's data.
- The saved record is versioned. An optional one-off import reads old logs from `sourdoughLogs`.

## Status

- [x] **Milestone 0: set-up.** TypeScript (strict) and Preact in place, the carry-over modules ported to `src/domain` with their tests, the first app parked in `legacy/` (removed in milestone 7), a placeholder Preact shell with the design tokens, PWA and update prompt, and CI that typechecks, tests and builds. Pages needs switching on once in the repository settings.

- [x] **Milestone 1: plan model** (`src/domain/plan`). Zone-aware time helpers, levers, forward planner on real timestamps, rules (waking hours, fridge range, rest before carving), backward planner (fresh, more flavour, bedtime, no fridge), fit hints (range, fridge fit and nudge, start-now levers) and live reconcile (ticks, shifts, keep my bake time, locks). Tests include the clocks-going-back weekend of 25 October 2026. Rest before carving is counted from the loaf coming out of the oven.
- [x] **Milestone 2: timeline and Start now** (branch `timeline-start-now`). Horizontal timeline with sleeping bands and a Now marker, the levers (feed, wait, dough temperature, fridge with nudge and the no-fridge unlock, cooling), the range line and a step list. Component tests added. Review with the owner next.
- [x] **Milestone 3: Bread at…** (branch `bread-at`). Mode switch, carve picker (day chips, meal chips, slider that works out plans on release), plan cards from the backward planner (baked fresh, more flavour, bedtime, and a quiet no-fridge link), and the same timeline and levers underneath through a shared plan view.
- [x] **Milestone 4: live view** (branch `live-view`, built on `bread-at`). "Start this plan" locks the plan and saves it (`loafoclockLive`, versioned). The live view has the Now marker, a Next up card with countdown and free time, deliberate ticks, four fold ticks, "when did you do this?" at the autolyse and the starter going in, undo, keep my bake time, edit-after-lock with the locks, and resume after a reload. Reminders are still to do.
- [x] **Milestone 5: steps** (branch `steps`). "Open the step" (from Next up or any step in the list) shows the amounts for your loaves, the instructions, the tip and a timer that is saved with the bake. The levers now include your loaf: one or two loaves, size and hydration.
- [x] **Milestone 6: log and the rest** (branch `log-and-rest`). Tabs for Plan, Log, Settings and Help (About from Help and the footer). Finishing a bake asks how it went and logs it with the feed ratio; the log has Repeat, remove, save and restore a copy, and an optional one-off import from the first app's `sourdoughLogs` (never changed). Settings: colours, text size, clock. Help and FAQ include "Keeping a healthy starter" and the quick-feed nudge after 3 in a row. Waking hours are now a setting (see below).
- [x] **Milestone 7: polish** (branch `polish`). Contrast checked for both themes (text passes AA; control borders and the light bulk bar raised to 3:1), keyboard-scrollable timeline, focus handling in the "when did you do this?" sheet, bigger tap targets, no sideways overflow at the largest text size on a phone, parked first-app code removed. Offline: the build precaches the app, styles and font. **Still to do by hand on a real phone:** install to the home screen, check offline and the update prompt.
- [x] **Waking hours setting.** Settings has "Up from" (5:00 to 10:00 am) and "In bed by" (8:00 to 11:30 pm), defaulting to 6:00 am and 11:00 pm. The plan, the nudges, the bedtime bake and the timeline's sleeping bands all follow it.
- [x] **Plan, Bake and Log tabs; menu.** The top tabs are Plan, Bake (the running bake, with a dot while one is running) and Log. Settings, Help and About are in a menu button at the top right. Starting a plan opens Bake, and starting another while one is running asks first. The calendar reminders download is under Start this plan on the Plan page, not in the bake.
- [x] **New plan tab (trial)** (branch `new-plan-page`). A second Plan page beside the classic one, so both can be shown to users. It has the same modes and levers, with the answer pinned at the top while you scroll, the steps on a vertical rail (`RailTimeline`: days named, waits drawn as coloured bars, a moon on waits that run into the night, the four folds as one row), and on screens 900px or wider the timeline across the top with the levers beside the rail. The classic page is untouched: `PlanView` picks the layout, so dropping the classic page means deleting `PlanDetail`'s layout, the `Plan` tab and the `layout` props. Not done yet: the better horizontal timeline (hour ticks, clearer labels), and the rail in the Bake view.

## UI conventions

- **Pairs of buttons:** the safe or secondary action goes on the left and the primary or destructive one on the right (Cancel | Save, Later | Reload, Skip the log | Save to the log). When buttons stack on a phone, the primary goes on top.
- **Destructive actions** (Stop this bake, Remove, Replace) are red, and so is their confirm button. They always ask first, with an in-app sheet, because the browser's own popup is blocked in some browsers.
- **Links** are for small in-line actions only. Anything that does something important is an outline or filled button.
- **Lists of things you tap** (the progress list) use whole-row buttons, at least 56px tall, that open in place, instead of rows of small links.
- **Times in a bake always run in order.** A step cannot be recorded earlier than the step before it, or later than the one after it. The picker stops at those limits and says why, and the timeline copes with any order anyway, so a saved bake can never push the bar out of its box.
- **Empty states** are one pattern: a short heading, one sentence, and a button only if there is something to press (`EmptyState`).
- **Text sizes** are six named sizes (12, 14, 16, 18, 22 and 28 px, all scaled by the Settings text size) and **corner radii** are four named sizes and a pill. They are defined in `tokens.css`, and a test fails if a stylesheet uses a bare number.
- **Times** follow the Clock setting everywhere, including the time fields.
- **Durations** are "1 h 30 min" on screen and full words in sentences. **Dates** are "Tomorrow 5:49 am" in labels and "tomorrow at 5:49 am" in sentences.

## Open items

1. Quick feeds in a row before the nudge: suggested 3.
2. Two loaves with different cold-ferment times: later.
3. ~~Reminders~~ Done: a calendar file with an alert 10 minutes before each step (branch `reminders`).
4. Whether the new app is announced at its own address and the old app later redirects to it.
