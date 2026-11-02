// Loaf sizes: regular fits a 25cm oval banneton (~1kg), large a 30cm one (~1.5kg).
// Flour and starter are fixed per loaf; hydration only changes the water.
import data from '../../data/recipe.json';
import bakeData from '../../data/bake.json';

export type LoafSize = 'regular' | 'large';

interface SizeSpec {
    label: string;
    flour: number;
    starter: number;
    note: string;
}

export const LOAF_SIZES = data.sizes as Record<LoafSize, SizeSpec>;

/** What is chosen for a bake. `size` may be missing or unknown on old saved data. */
export interface BakeChoices {
    loaves: number;
    size?: string;
    hydration?: number;
}

const sizeOf = (bake: { size?: string }): SizeSpec => LOAF_SIZES[bake.size as LoafSize] ?? LOAF_SIZES.regular;

// Total hydration counts the starter as half flour, half water (100% hydration starter)
export const HYDRATIONS: readonly number[] = data.hydration.choices;
export const DEFAULT_HYDRATION = data.hydration.default;
const WATER_ROUNDING_G = data.water.roundingG;
// Snap to a round 50g if the exact amount is within this leeway, so the recipe feels tidy
const WATER_SNAP_G = data.water.snapG;
const WATER_LEEWAY_G = data.water.leewayG;

// Salt, honey and oil for a regular loaf (450g flour); other sizes keep the same proportion to the flour
const REGULAR_FLOUR = LOAF_SIZES.regular.flour;
const EXTRAS = data.extrasForRegular;
const extra = (grams: number, size: SizeSpec): number => Math.round((grams * size.flour) / REGULAR_FLOUR);

export interface Recipe {
    flour: number;
    water: number;
    starter: number;
    salt: number;
    honey: number;
    oil: number;
}

export function recipeFor(bake: BakeChoices): Recipe {
    const size = sizeOf(bake);
    const hydration = (bake.hydration || DEFAULT_HYDRATION) / 100;
    const totalFlour = size.flour + size.starter / 2;
    const exactWater = Math.round((hydration * totalFlour - size.starter / 2) * 100) / 100; // trims float noise
    const snapped = Math.round(exactWater / WATER_SNAP_G) * WATER_SNAP_G;
    const water = Math.abs(snapped - exactWater) <= WATER_LEEWAY_G
        ? snapped
        : Math.round(exactWater / WATER_ROUNDING_G) * WATER_ROUNDING_G;
    const n = bake.loaves;
    return {
        flour: size.flour * n,
        water: water * n,
        starter: size.starter * n,
        salt: extra(EXTRAS.salt, size) * n,
        honey: extra(EXTRAS.honey, size) * n,
        oil: extra(EXTRAS.oil, size) * n
    };
}

export function loafDescription(bake: BakeChoices): string {
    const size = sizeOf(bake);
    return `${bake.loaves} × ${size.label} (${size.note})`;
}

// Bake times: the large loaf needs longer in the pot than the regular one
export interface BakeTimes {
    lidOn: string;
    lidOff: string;
    total: string;
    minutes: number;
}

export const OVEN_C = bakeData.ovenC;

const range = ([lo, hi]: readonly number[]): string => (lo === hi ? `${lo}` : `${lo}-${hi}`);
const bakeTimes = ([size, m]: [string, (typeof bakeData.minutes)['regular']]): [string, BakeTimes] => {
    const lo = m.lidOn[0]! + m.lidOff[0]!;
    const hi = m.lidOn[1]! + m.lidOff[1]!;
    return [size, { lidOn: range(m.lidOn), lidOff: range(m.lidOff), total: `${range([lo, hi])} minutes total`, minutes: hi }];
};
export const BAKE_TIMES = Object.fromEntries(Object.entries(bakeData.minutes).map(bakeTimes)) as Record<LoafSize, BakeTimes>;

export function bakePlan(bake: { size?: string }): { duration: string; totalMinutes: number; instructions: string[] } {
    const t = BAKE_TIMES[bake.size as LoafSize] ?? BAKE_TIMES.regular;
    return {
        duration: t.total,
        totalMinutes: t.minutes, // the longer end, for planning
        instructions: [
            `Preheat oven and Dutch oven to ${OVEN_C.lidOn}°C`,
            'Place dough directly from fridge into hot Dutch oven',
            'Add ice to Dutch oven for steam',
            `Bake at ${OVEN_C.lidOn}°C for ${t.lidOn} minutes (lid on)`,
            `Reduce to ${OVEN_C.lidOff}°C and bake ${t.lidOff === '25' ? '25 more' : `${t.lidOff} more`} minutes (lid off)`
        ]
    };
}
