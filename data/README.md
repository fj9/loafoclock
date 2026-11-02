# Data tables

The numbers behind the planner, kept as plain JSON so the app, the handbook and the PDFs all read the same values.

| File | What it holds |
|---|---|
| `feeding-ratios.json` | Feed ratios 1:1:1 to 1:10:10 and the hours each takes to peak, and the standard feed |
| `bulk.json` | Dough temperature to bulk hours and target rise |
| `recipe.json` | Loaf sizes, hydration choices, salt/honey/oil, water rounding, starter to keep back |
| `bake.json` | Oven temperatures and bake minutes by loaf size |
| `timing.json` | Step lengths, rest, fridge, cooling, wait slider and waking-hour limits |

Planner logic (rounding, choosing a row, building the timeline) stays in `src/domain`. Only the numbers live here.
The handbook gets its tables and `{{fact}}` values from the domain code, which reads these files, so change a
number here and the app, handbook and PDFs follow. Do not type these numbers into app text or handbook chapters.
`data.test.ts` checks the shape and ordering of every file.
