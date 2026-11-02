// The numbers the handbook quotes, taken from the same code that builds the plan, so they cannot drift.
// The markdown names them as {{name}} or {{name value}}.
import { FEEDING_RATIOS, ASSUMED_RATIO_N, findRatio } from '../domain/feeding';
import { BAKE_TIMES, LOAF_SIZES, OVEN_C, DEFAULT_HYDRATION, recipeFor, type LoafSize } from '../domain/recipe';
import { BULK_TABLE, COOLING_CHOICES, FRIDGE_MAX_HOURS, FRIDGE_MIN_HOURS, STEP_MINUTES, bulkFor } from '../domain/plan';
import { KEEP_BACK_G } from '../domain/stepGuide';
import { REST_DEFAULT, REST_MAX, REST_MIN } from '../domain/timing';
import type { Facts } from './compile';
import { exampleFor, exampleSpec, exampleStepAt, exampleTimeAt } from './example';

const table = (head: string[], rows: string[][]): string =>
    [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

/** 5.5 is "5 and a half hours", 7 is "7 hours". */
function hoursText(h: number): string {
    const whole = Math.floor(h);
    return h === whole ? plural(h, 'hour') : `${whole} and a half hours`;
}

/** 5.5 is "5h 30m", the style the bulk chart has always used. */
const hm = (h: number): string => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`;

const sizes = Object.keys(LOAF_SIZES) as LoafSize[];
const ratioOf = (arg: string) => {
    const r = findRatio(`1:${arg}:${arg}`);
    if (!r) throw new Error(`no feeding ratio 1:${arg}:${arg}`);
    return r;
};

export const FACTS: Facts = {
    // ---- Tables ----
    bulkTable: table(['Dough temperature', 'Bulk time', 'Target rise'], BULK_TABLE.map((r) => [`${r.temp}°C`, hm(r.hours), `${r.rise}%`])),
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
        return `about ${hoursText(row.hours)}, until the dough has risen by about ${row.rise}%`;
    },
    /** {{feedWindow 6}}: how long a 1:6:6 feed takes to be ready. */
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
    /** {{time afterWork ovenOn}}: just the time, "5:15 pm". */
    time: (arg) => {
        const [name = '', step = ''] = arg.split(/\s+/);
        return exampleTimeAt(name, step);
    },
    feedWindow: (arg) => `${ratioOf(arg).minHours} to ${ratioOf(arg).maxHours} hours`,

    // ---- Single values ----
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
