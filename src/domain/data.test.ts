import { describe, expect, it } from 'vitest';
import bake from '../../data/bake.json';
import bulk from '../../data/bulk.json';
import feeding from '../../data/feeding-ratios.json';
import recipe from '../../data/recipe.json';
import timing from '../../data/timing.json';

const rising = (xs: number[]) => xs.every((x, i) => i === 0 || x >= xs[i - 1]!);

describe('data tables', () => {
    it('feeding ratios run 1:1:1 upwards with sensible windows', () => {
        feeding.ratios.forEach((r, i) => {
            expect(r.n).toBe(i + 1);
            expect(r.minHours).toBeGreaterThan(0);
            expect(r.maxHours).toBeGreaterThan(r.minHours);
        });
        expect(rising(feeding.ratios.map((r) => r.minHours))).toBe(true);
        expect(rising(feeding.ratios.map((r) => r.maxHours))).toBe(true);
        expect(feeding.ratios.map((r) => r.n)).toContain(feeding.standardN);
    });

    it('bulk rows go from warm to cool and take longer as the dough cools', () => {
        const temps = bulk.rows.map((r) => r.temp);
        expect(temps).toEqual([...temps].sort((a, b) => b - a));
        expect(new Set(temps).size).toBe(temps.length);
        expect(rising(bulk.rows.map((r) => r.hours))).toBe(true);
        expect(rising(bulk.rows.map((r) => r.rise))).toBe(true);
        for (const r of bulk.rows) expect(r.hours).toBeGreaterThan(0);
    });

    it('recipe sizes, hydrations and rounding are usable', () => {
        for (const s of Object.values(recipe.sizes)) {
            expect(s.flour).toBeGreaterThan(0);
            expect(s.starter).toBeGreaterThan(0);
            expect(s.label).not.toBe('');
        }
        expect(recipe.hydration.choices).toContain(recipe.hydration.default);
        expect(rising(recipe.hydration.choices)).toBe(true);
        expect(recipe.water.snapG).toBeGreaterThan(recipe.water.roundingG);
        expect(recipe.keepBackG).toBeGreaterThan(0);
    });

    it('every loaf size has bake times, shortest not longer than longest', () => {
        expect(Object.keys(bake.minutes).sort()).toEqual(Object.keys(recipe.sizes).sort());
        expect(bake.ovenC.lidOn).toBeGreaterThanOrEqual(bake.ovenC.lidOff);
        for (const m of Object.values(bake.minutes)) {
            for (const [lo, hi] of [m.lidOn, m.lidOff]) expect(lo).toBeLessThanOrEqual(hi!);
        }
    });

    it('timing limits are in order', () => {
        expect(timing.rest.min).toBeLessThanOrEqual(timing.rest.default);
        expect(timing.rest.default).toBeLessThanOrEqual(timing.rest.max);
        expect(timing.fridgeHours.min).toBeLessThan(timing.fridgeHours.max);
        expect(timing.waitHours.min).toBeLessThan(timing.waitHours.max);
        expect(timing.wakingHours.from).toBeLessThan(timing.wakingHours.to);
        for (const v of Object.values(timing.stepMinutes)) expect(v).toBeGreaterThan(0);
        // the slider's wait range is covered by the feeding table
        expect(timing.waitHours.min).toBe(feeding.ratios[0]!.minHours);
        expect(timing.waitHours.max).toBe(feeding.ratios[feeding.ratios.length - 1]!.maxHours);
    });
});
