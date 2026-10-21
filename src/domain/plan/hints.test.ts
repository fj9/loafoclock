import { describe, expect, it } from 'vitest';
import { carveRange, fridgeFit, nudgeFridge, startNowLevers } from './hints';
import { leversAt } from './levers';
import { fitsWakingHours } from './rules';
import { buildPlan, totalHours } from './steps';
import { zonedToMs, isAwake } from './time';

const LONDON = 'Europe/London';
const at = (mo: number, d: number, h: number, m = 0) => zonedToMs({ year: 2026, month: mo, day: d, hour: h, minute: m }, LONDON);

describe('carve range', () => {
    it('the fastest is about 20 hours and skipping the fridge saves about 14', () => {
        const r = carveRange(0, { cooling: 30 });
        expect(totalHours(r.fastest)).toBeCloseTo(19.5, 6);
        const saved = totalHours(r.fastest) - totalHours(r.noFridge);
        expect(saved).toBeCloseTo(8 - 2.5, 6);
        expect(totalHours(r.slowest)).toBeGreaterThan(totalHours(r.fastest) + 50);
    });
    it('nothing is faster than the fastest with the fridge', () => {
        const r = carveRange(0);
        for (const n of [1, 2, 3, 6]) for (const t of [20, 24, 27]) {
            const p = buildPlan(leversAt(0, { ratioN: n, doughTemp: t, fridge: { kind: 'hours', hours: 8 } }));
            expect(p.readyToCarve).toBeGreaterThanOrEqual(r.fastest.readyToCarve);
        }
    });
});

describe('fridge fit', () => {
    const levers = leversAt(at(10, 23, 9), { ratioN: 3 });
    it('lists only times where the oven, bake and loaf out are awake', () => {
        const ranges = fridgeFit(levers, LONDON);
        expect(ranges.length).toBeGreaterThan(0);
        for (const r of ranges) for (const h of [r.from, r.to]) {
            const p = buildPlan({ ...levers, fridge: { kind: 'hours', hours: h } });
            expect(isAwake(p.byId.ovenOn, LONDON) && isAwake(p.byId.bake, LONDON) && isAwake(p.byId.out, LONDON)).toBe(true);
        }
    });
    it('nudges to the nearest time that fits', () => {
        const near = nudgeFridge({ ...levers, fridge: { kind: 'hours', hours: 8 } }, LONDON)!;
        const fit = fridgeFit(levers, LONDON);
        expect(fit.some((r) => near >= r.from && near <= r.to)).toBe(true);
        expect(nudgeFridge({ ...levers, fridge: { kind: 'none' } }, LONDON)).toBeNull();
    });
});

describe('start now', () => {
    it('suggests levers that fit waking hours', () => {
        for (const start of [at(10, 23, 9), at(10, 23, 15), at(10, 24, 8, 30), at(10, 24, 21), at(3, 28, 10)]) {
            const l = startNowLevers(start, {}, LONDON);
            expect(l).not.toBeNull();
            expect(fitsWakingHours(buildPlan(l!), { zone: LONDON })).toBe(true);
            expect(l!.feedAt).toBe(start);
        }
    });
    it('prefers a standard feed when it costs little', () => {
        const l = startNowLevers(at(10, 23, 9), {}, LONDON)!;
        expect(l.ratioN).toBeGreaterThanOrEqual(3);
    });
});
