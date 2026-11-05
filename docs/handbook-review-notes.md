# Handbook copy edit: review notes

Branch `handbook-copy-edit`. Handbook wording was not changed in this review.

## Conflicts

1. **Doneness order.** *(Resolved in the app, see below.)* The handbook's Doneness list in `content/handbook/14-baking.md:51-55` leads with colour, then the hollow base tap, then the optional probe reading. `content/handbook/20-quick-reference.md:29` leads with the hollow base tap and then the probe. The app's Bake guidance (`src/domain/stepGuide.ts:112-116`, built from `src/domain/recipe.ts:97-100`) gives times only and no doneness cue at all, so the app does not say "hollow base tap" or give the probe reading anywhere.
2. **Honey and oil are optional in the handbook, always listed in the app.** *(Resolved in the app, see below.)* Handbook: `content/handbook/05-ingredients.md:16-17`. App: `src/domain/stepGuide.ts:64-65` always shows "Add the salt, honey and olive oil" with gram amounts, and `src/domain/tips.ts:67` says they "make the loaf softer" with no mention that they are optional or that honey is not for babies under 12 months. The app has no setting to leave them out (`data/recipe.json`).
3. **Where to measure dough temperature.** *(Resolved in the app, see below.)* Handbook: measure with a probe just after the starter is mixed in (`content/handbook/09-process.md:62`; `data/bulk.json` note agrees). App tip `src/domain/tips.ts:79`: "A thermometer in the middle of the dough is best" with no mention of timing.
4. **Fridge proof vs cold retard.** The handbook uses "fridge proof". Fixed in the app: the tip label `src/domain/tips.ts:98` was "cold retardation", now "fridge proof". The internal tip key `retardation` (`src/domain/tips.ts:115`, `src/domain/stepGuide.ts:102`, `src/app/Levers.tsx:72`) is not user-visible and was left alone. `docs/build-plan.md:25` still says "cold retard" (design history, left alone). The glossary keeps "Cold retard" and "Retard" as synonym entries (`content/handbook/19-glossary.md:18,44`), which is consistent with explaining the term.
5. **Cooling.** `coolingLong` and `coolingShort` come from `src/handbook/facts.ts:130-131` and match `COOLING_CHOICES`. The app's "Loaf out" step (`src/domain/stepGuide.ts:120`) says "at least N minutes", using the chosen value. No conflict.

Checked and consistent: the ten step names and numbers in `data/steps.json` match the headings in `09-process.md`. Bulk is counted from the moment the starter goes in in `data/bulk.json`, `data/README.md:8`, `docs/build-plan.md:32` and `src/domain/plan/steps.ts:83`. The anchors `lever-3-fridge-proof`, `dutch-oven`, `bulk`, `what-it-is-and-where-to-get-one` and `final-proof-no-fridge` all resolve. The app never hard-codes handbook anchors: "Learn more" links come from `steps=` in the handbook headings. No "rubber band" in prose (only the UK/US table in the appendix).

### Resolved in the app

- Bake step (`src/domain/stepGuide.ts`) now ends with the hollow base tap, and the 96 to 99°C probe reading as optional. The handbook's own Doneness order (colour first) is unchanged and still differs.
- Salt step lists honey and oil as optional, with the under-12-months honey note; the tip says the same. The step title is unchanged.
- Dough temperature tip (`src/domain/tips.ts`) now says to measure just after the starter is mixed in.

## Confusing for a beginner

- **Two names for the starter-in step.** "Add the starter" (step 3) is also called "the fermentolyse" (`content/handbook/09-process.md:22,28`, `data/steps.json`, `src/domain/stepGuide.ts:60`). The word appears in the app and in the handbook, but a first-time reader meets "fermentolyse" before the glossary.
- **"Levain" and "starter".** `09-process.md:12` introduces a levain as a separate jar; `19-glossary.md:35,47` says a leaven or sourdough culture is another name for the starter. The chapter and example ids still contain "levain" (`example-overnight-levain`), and `21-example-overnight-levain.md:4` is titled "Overnight feed, three days". Readers may think levain and starter are different things.
- **Bulk fermentation is not a numbered step but overlaps steps 3 to 6.** It starts at step 3 and ends at the pre-shape, so a reader looking down "Step 1 to 10" sees a section between Step 5 and Step 6 that is not a step.
- **Doneness order.** The Doneness section leads with colour, but the quick reference and the app's expected cue are the hollow tap.
- **Final proof without the fridge** (`09-process.md:120`) sits after Step 8 as an unnumbered section, while the app's step 8 swaps between "Into the fridge" and "Proof on the counter".

## Missing from the working tree

None. Every item listed in the task's section 2 was found.

## Test status

- `npm test`: 38 files, 373 tests, all passing (after the changes below).
- `npm run typecheck`: clean. There is no lint script.
- Initially 2 failures, both expected: `src/app/LearnMore.test.tsx:16` and `src/app/Handbook.test.tsx:35` (the bulk fermentation heading is now unnumbered). Both assertions were updated to "Bulk fermentation (the first rise)". `LearnMore.test.tsx:14` needed no change.
- `StartNow.test.tsx` passed 3 of 3 runs alone and in every full run: not flaky in this session.
- Code change beyond the two assertions: `src/domain/tips.ts` label "cold retardation" to "fridge proof".
