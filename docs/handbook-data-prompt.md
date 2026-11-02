# Prompt: make the handbook take its numbers from the data

Use this after the handbook content rework lands. Paste everything below the line into a new session.

---

The Loaf O'Clock handbook in `content/handbook/*.md` has been reworked. The app is the source of truth for every
number, and those numbers live in `data/*.json` (see `data/README.md`): `feeding-ratios.json`, `bulk.json`,
`recipe.json`, `bake.json` and `timing.json`. The domain code in `src/domain` reads them, and
`src/handbook/facts.ts` turns them into `{{fact}}` placeholders and generated tables, so the handbook, the app
and both PDFs agree.

Make the reworked handbook take every number from that data, with nothing typed in by hand.

1. **Find hand-typed numbers.** Read every chapter in `content/handbook/` (including `handbook.json` and
   `examples.json`). List each place a number comes from the planner rather than from the author's opinion:
   feeding ratios and hours, bulk hours and rise by temperature, quantities and percentages, hydration, oven
   temperatures and bake times, fold counts and gaps, rests, preheat, fridge range, cooling, waking hours,
   keep-back starter, and any time or duration in the worked examples. For each, say which data file holds it.
2. **Replace them with facts.** Use an existing fact in `facts.ts` where one fits (`{{bulk 24}}`,
   `{{feedTable}}`, `{{recipeTable}}`, `{{bakeTable}}`, `{{feedWindow 7}}`, `{{feedFor 7 1}}`, `{{at example step}}`
   and so on). Where none fits, add a fact to `facts.ts` that reads from the domain exports (which read `data/`).
   Never copy a value into `facts.ts` as a literal. Worked examples stay in `examples.json` as planner specs, and
   their times come from the planner.
3. **Leave prose alone.** Judgements, advice and descriptions stay as the author wrote them (for example "a warm
   kitchen speeds things up"). Only numbers that the app computes or stores move to facts.
4. **Add a guard.** Extend `src/handbook/handbook.test.ts` so a digit followed by a planner unit (`°C`, `g`, `%`,
   `min`, `minutes`, `hour(s)`, `h`) in chapter text outside `{{ }}` fails unless it is on a short allow-list of
   author-owned figures kept in the test with a reason for each. The failure message should name the chapter, the
   line and the nearby text.
5. **Prove nothing drifted.** Change a value in a data file temporarily (for example the 24°C bulk hours), run
   `npm test` and `npm run handbook:pdf`, and confirm the handbook text and PDF follow; then revert it. Report any
   number in the new handbook that disagrees with the app, and fix the handbook rather than the data unless I say
   the data is wrong.
6. **Check as usual.** `npx tsc --noEmit -p tsconfig.json`, `npx vitest run` (the calendar test in
   `StartNow.test.tsx` already fails on main), `npm run handbook:pdf -- --require`, and keep the existing rules:
   no curly quotes, no em dashes, no dates or weekdays in examples, and no AI wording in the reader chapters.

Give me a summary of what moved to facts, what stayed as prose, and the allow-list with reasons. Commit as its own
change on the current branch.
