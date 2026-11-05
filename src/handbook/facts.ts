// The numbers the handbook quotes, taken from the same code that builds the plan, so they cannot drift.
// The markdown names them as {{name}} or {{name value}}.
import { FEEDING_RATIOS, ASSUMED_RATIO_N, feedAt, findRatio } from '../domain/feeding';
import { BAKE_TIMES, LOAF_SIZES, OVEN_C, DEFAULT_HYDRATION, recipeFor, type LoafSize } from '../domain/recipe';
import { BULK_TABLE, BULK_TOO_COOL, BULK_TOO_WARM, COOLING_CHOICES, FINAL_PROOF_TABLE, FRIDGE_MAX_HOURS, FRIDGE_MIN_HOURS, STEP_MINUTES, bulkFor, finalProofFor, hoursRangeProse } from '../domain/plan';
import { KEEP_BACK_G } from '../domain/stepGuide';
import { REST_DEFAULT, REST_MAX, REST_MIN } from '../domain/timing';
import { NUMBERED_STEPS, STEP_COUNT, phaseOf, stepName, stepNumber } from '../domain/steps';
import type { Facts } from './compile';
import { exampleFor, exampleLength, exampleSpec, exampleStepAt, exampleTimeAt } from './example';

const table = (head: string[], rows: string[][]): string =>
    [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

/** 1.5 and 2 are "1.5–2", the style the tables use for a range. */
const dashRange = (r: { minHours: number; maxHours: number }): string =>
    r.minHours === r.maxHours ? `${r.maxHours}` : `${r.minHours}–${r.maxHours}`;

const sizes = Object.keys(LOAF_SIZES) as LoafSize[];
const ratioOf = (arg: string) => {
    const r = findRatio(`1:${arg}:${arg}`);
    if (!r) throw new Error(`no feeding ratio 1:${arg}:${arg}`);
    return r;
};

export const FACTS: Facts = {
    // ---- Tables ----
    bulkTable: table(['Dough temperature', 'Bulk time (hours)', 'Target rise'], BULK_TABLE.map((r) => [`${r.temp}°C`, dashRange(r), `${r.rise}%`])),
    finalProofTable: table(['Room temperature', 'Final proof (hours)'], FINAL_PROOF_TABLE.map((r) => [`${r.temp}°C`, dashRange(r)])),
    feedTable: table(['Feed (starter : flour : water)', 'Ready after'], FEEDING_RATIOS.map((r) => [r.ratio, `${r.minHours} to ${r.maxHours} hours`])),
    recipeTable: table(
        ['Ingredient', ...sizes.map((s) => `${LOAF_SIZES[s].label} loaf (${LOAF_SIZES[s].note})`)],
        ([['Flour', 'flour'], ['Water', 'water'], ['Active starter', 'starter'], ['Salt', 'salt'], ['Honey', 'honey'], ['Extra virgin olive oil', 'oil']] as const)
            .map(([label, key]) => [label, ...sizes.map((s) => `${recipeFor({ loaves: 1, size: s })[key]} g`)])
    ),
    bakeTable: table(
        ['Loaf', 'Lid on', 'Lid off', 'In the oven'],
        sizes.map((s) => [LOAF_SIZES[s].label, `${BAKE_TIMES[s].lidOn} minutes at ${OVEN_C.lidOn}°C`, `${BAKE_TIMES[s].lidOff} minutes at ${OVEN_C.lidOff}°C`, BAKE_TIMES[s].total])
    ),

    // ---- Values with an argument ----
    /** {{bulk 24}}: the bulk for a dough at 24°C. */
    bulk: (arg) => {
        const row = bulkFor(Number(arg));
        return `about ${hoursRangeProse(row)}, until the dough has risen by about ${row.rise}%`;
    },
    /** {{finalProof 24}}: the final proof at room temperature for a room at 24°C. */
    finalProof: (arg) => `about ${hoursRangeProse(finalProofFor(Number(arg)))}`,
    /** {{feedWindow 6}}: how long a 1:6:6 feed takes to be ready. */
    /** {{amountsTable 2}}: the amounts for one regular loaf and for that many. */
    amountsTable: (arg) => {
        const n = Number(arg);
        const one = recipeFor({ loaves: 1, size: 'regular' });
        const many = recipeFor({ loaves: n, size: 'regular' });
        const rows = ([['Flour', 'flour'], ['Water', 'water'], ['Active starter', 'starter'], ['Salt', 'salt'], ['Honey', 'honey'], ['Extra virgin olive oil', 'oil']] as const)
            .map(([label, key]) => [label, `${one[key]} g`, `${many[key]} g`]);
        return table(['Ingredient', 'One regular loaf', `${n} regular loaves`], rows);
    },
    /** {{feedFor 6 2}}: the feed for that ratio and number of regular loaves, with the starter to keep back included. */
    feedFor: (arg) => {
        const [ratio = '', loaves = '1'] = arg.split(/\s+/);
        const f = feedAt(Number(ratio), recipeFor({ loaves: Number(loaves), size: 'regular' }).starter + KEEP_BACK_G);
        return `${f.starter} g starter, ${f.flour} g flour and ${f.water} g water`;
    },
    /** {{planFigure afterWork}}: a worked example (named in examples.json) drawn as the app draws a plan. */
    planFigure: (arg) => {
        const spec = exampleSpec(arg);
        exampleFor(spec); // an example with a step in the sleeping hours stops the build
        return `<div class="hb-figure" data-plan="${spec}"></div>`;
    },
    /** {{at afterWork ovenOn}}: when a step of a worked example happens, as "Day 2, 5:15 pm". */
    at: (arg) => {
        const [name = '', step = ''] = arg.split(/\s+/);
        return exampleStepAt(name, step);
    },
    /** {{fridgeHours twoLoavesFirst}}: the hours the dough spends in the fridge in a worked example, "18". */
    fridgeHours: (arg) => `${exampleFor(exampleSpec(arg)).fridgeHours}`,
    /** {{fromFeed afterWork}}: how long the example takes from the first feed to ready to carve, "36 h 30 min". */
    fromFeed: (arg) => exampleLength(arg),
    /** {{feedChoices 6 7 8}}: the feed for each ratio, with the starter chosen so each makes the same amount: one regular loaf plus the starter to keep. */
    feedChoices: (arg) => {
        const need = recipeFor({ loaves: 1, size: 'regular' }).starter + KEEP_BACK_G;
        const rows = arg.split(/\s+/).map((n) => {
            const f = feedAt(Number(n), need);
            const r = findRatio(`1:${n}:${n}`)!;
            return [`1:${n}:${n}`, `${f.starter} g`, `${f.flour} g`, `${f.water} g`, `${f.total} g`, `${r.minHours} to ${r.maxHours} hours`];
        });
        return table(['Feed', 'Starter', 'Flour', 'Water', 'Makes', 'Ready after'], rows);
    },
    /** {{time afterWork ovenOn}}: just the time, "5:15 pm". */
    time: (arg) => {
        const [name = '', step = ''] = arg.split(/\s+/);
        return exampleTimeAt(name, step);
    },
    feedWindow: (arg) => `${ratioOf(arg).minHours} to ${ratioOf(arg).maxHours} hours`,

    /** {{stepNumber preShape}}: the number of a step, "6". An unknown key stops the build. */
    stepNumber: (arg) => `${stepNumber(arg)}`,
    /** {{stepName finalProof}}: the name of a step, "Final proof". */
    stepName: (arg) => stepName(arg),
    /** {{phase bulk}}: the steps a phase runs across, "steps 3 to 6". */
    phase: (arg) => {
        const p = phaseOf(arg);
        return `steps ${stepNumber(p.from)} to ${stepNumber(p.to)}`;
    },

    // ---- Single values ----
    stepList: NUMBERED_STEPS.map((s) => `${s.number}. ${s.name}`).join('\n'),
    stepCount: `${STEP_COUNT}`,
    bulkTooCool: BULK_TOO_COOL,
    bulkTooWarm: BULK_TOO_WARM,
    bulkCoolest: `${BULK_TABLE[BULK_TABLE.length - 1]!.temp}`,
    bulkWarmest: `${BULK_TABLE[0]!.temp}`,
    standardFeed: `1:${ASSUMED_RATIO_N}:${ASSUMED_RATIO_N}`,
    keepBack: `${KEEP_BACK_G}`,
    hydration: `${DEFAULT_HYDRATION}`,
    starterPercent: `${Math.round((LOAF_SIZES.regular.starter / LOAF_SIZES.regular.flour) * 100)}`,
    ovenOn: `${OVEN_C.lidOn}`,
    ovenLidOff: `${OVEN_C.lidOff}`,
    preheat: `${STEP_MINUTES.preheat}`,
    foldGap: `${STEP_MINUTES.foldGap}`,
    foldCount: `${STEP_MINUTES.foldCount}`,
    saltRest: `${STEP_MINUTES.saltRest}`,
    benchRest: `${STEP_MINUTES.preShape}`,
    fridgeMin: `${FRIDGE_MIN_HOURS}`,
    fridgeMax: `${FRIDGE_MAX_HOURS}`,
    restMin: `${REST_MIN}`,
    restMax: `${REST_MAX}`,
    restDefault: `${REST_DEFAULT}`,
    coolingShort: `${COOLING_CHOICES[0]}`,
    coolingLong: `${COOLING_CHOICES[1]}`
};
