// Loaf sizes: regular fits a 25cm oval banneton (~1kg), large a 30cm one (~1.5kg).
// Flour and starter are fixed per loaf; hydration only changes the water.
export type LoafSize = 'regular' | 'large';

interface SizeSpec {
    label: string;
    flour: number;
    starter: number;
    note: string;
}

export const LOAF_SIZES: Record<LoafSize, SizeSpec> = {
    regular: { label: 'Regular', flour: 450, starter: 150, note: '25cm banneton, ~1kg' },
    large: { label: 'Large', flour: 600, starter: 200, note: '30cm banneton, ~1.5kg' }
};

/** What is chosen for a bake. `size` may be missing or unknown on old saved data. */
export interface BakeChoices {
    loaves: number;
    size?: string;
    hydration?: number;
}

const sizeOf = (bake: { size?: string }): SizeSpec => LOAF_SIZES[bake.size as LoafSize] ?? LOAF_SIZES.regular;

// Total hydration counts the starter as half flour, half water (100% hydration starter)
export const HYDRATIONS = [60, 65, 70, 75, 80] as const;
export const DEFAULT_HYDRATION = 70;
const WATER_ROUNDING_G = 5;
// Snap to a round 50g if the exact amount is within this leeway, so the recipe feels tidy
const WATER_SNAP_G = 50;
const WATER_LEEWAY_G = 10;

// Salt, honey and oil for a regular loaf (450g flour); other sizes keep the same proportion to the flour
const REGULAR_FLOUR = 450;
const EXTRAS = { salt: 10, honey: 15, oil: 20 };
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
interface BakeTimes {
    lidOn: string;
    lidOff: string;
    total: string;
    minutes: number;
}

const BAKE_TIMES: Record<LoafSize, BakeTimes> = {
    regular: { lidOn: '20', lidOff: '20-25', total: '40-45 minutes total', minutes: 45 },
    large: { lidOn: '25', lidOff: '25', total: '50 minutes total', minutes: 50 }
};

export function bakePlan(bake: { size?: string }): { duration: string; totalMinutes: number; instructions: string[] } {
    const t = BAKE_TIMES[bake.size as LoafSize] ?? BAKE_TIMES.regular;
    return {
        duration: t.total,
        totalMinutes: t.minutes, // the longer end, for planning
        instructions: [
            'Preheat oven and Dutch oven to 240°C',
            'Place dough directly from fridge into hot Dutch oven',
            'Add ice to Dutch oven for steam',
            `Bake at 240°C for ${t.lidOn} minutes (lid on)`,
            `Reduce to 230°C and bake ${t.lidOff === '25' ? '25 more' : `${t.lidOff} more`} minutes (lid off)`
        ]
    };
}
