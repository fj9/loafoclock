import { describe, expect, it } from 'vitest';
import { HYDRATIONS, loafDescription, recipeFor } from './recipe.js';

const one = (size, hydration, loaves = 1) => recipeFor({ size, hydration, loaves });

describe('recipeFor', () => {
    it('regular loaf at 70% is 450 flour, 300 water, 150 starter', () => {
        expect(one('regular', 70)).toMatchObject({ flour: 450, water: 300, starter: 150 });
    });

    it('large loaf at 70% is 600 flour, 400 water, 200 starter', () => {
        expect(one('large', 70)).toMatchObject({ flour: 600, water: 400, starter: 200 });
    });

    it('salt, honey and oil keep the same proportion to the flour', () => {
        expect(one('regular', 70)).toMatchObject({ salt: 10, honey: 15, oil: 20 });
        expect(one('large', 70)).toMatchObject({ salt: 13, honey: 20, oil: 27 });
    });

    it('hydration changes only the water', () => {
        for (const size of ['regular', 'large']) {
            const base = one(size, 70);
            for (const h of HYDRATIONS) {
                const r = one(size, h);
                expect({ ...r, water: 0 }).toEqual({ ...base, water: 0 });
            }
        }
    });

    it('more hydration never means less water', () => {
        for (const size of ['regular', 'large']) {
            const waters = HYDRATIONS.map((h) => one(size, h).water);
            expect(waters).toEqual([...waters].sort((a, b) => a - b));
        }
    });

    it('water stays within 10g of the exact total hydration, in whole 5g steps', () => {
        const sizes = { regular: [450, 150], large: [600, 200] };
        for (const [size, [flour, starter]] of Object.entries(sizes)) {
            for (const h of HYDRATIONS) {
                const exact = (h / 100) * (flour + starter / 2) - starter / 2;
                const water = one(size, h).water;
                expect(Math.abs(water - exact)).toBeLessThanOrEqual(10 + 1e-9);
                expect(water % 5).toBe(0);
            }
        }
    });

    it('two loaves double every amount', () => {
        const single = one('large', 75);
        const double = one('large', 75, 2);
        for (const key of Object.keys(single)) expect(double[key]).toBe(single[key] * 2);
    });

    it('defaults to a regular loaf at 70% for older saved bakes', () => {
        expect(recipeFor({ loaves: 1 })).toEqual(one('regular', 70));
    });

    it('large loaf plus carryover is 230g of starter', () => {
        expect(one('large', 70).starter + 30).toBe(230);
    });
});

describe('loafDescription', () => {
    it('names the count, size and banneton', () => {
        expect(loafDescription({ loaves: 2, size: 'large' })).toBe('2 × Large (30cm banneton, ~1.5kg)');
    });
});
