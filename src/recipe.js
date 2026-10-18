// Loaf sizes: regular fits a 25cm oval banneton (~1kg), large a 30cm one (~1.5kg).
// Flour and starter are fixed per loaf; hydration only changes the water.
export const LOAF_SIZES = {
    regular: { label: 'Regular', flour: 450, starter: 150, note: '25cm banneton, ~1kg' },
    large: { label: 'Large', flour: 600, starter: 200, note: '30cm banneton, ~1.5kg' }
};

// Total hydration counts the starter as half flour, half water (100% hydration starter)
export const HYDRATIONS = [60, 65, 70, 75, 80];
export const DEFAULT_HYDRATION = 70;
const WATER_ROUNDING_G = 5;
// Snap to a round 50g if the exact amount is within this leeway, so the recipe feels tidy
const WATER_SNAP_G = 50;
const WATER_LEEWAY_G = 10;

// Salt, honey and oil for a regular loaf (450g flour); other sizes keep the same proportion to the flour
const REGULAR_FLOUR = 450;
const EXTRAS = { salt: 10, honey: 15, oil: 20 };
const extra = (grams, size) => Math.round(grams * size.flour / REGULAR_FLOUR);

export function recipeFor(bake) {
    const size = LOAF_SIZES[bake.size] || LOAF_SIZES.regular;
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

export function loafDescription(bake) {
    const size = LOAF_SIZES[bake.size] || LOAF_SIZES.regular;
    return `${bake.loaves} × ${size.label} (${size.note})`;
}
