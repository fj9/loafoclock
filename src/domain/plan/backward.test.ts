import { describe, expect, it } from 'vitest';
import { planBackward, planBackwardWithReasons } from './backward';
import { fitsWakingHours, violations } from './rules';
import { buildPlan } from './steps';
import { HOUR, zonedToMs } from './time';

const LONDON = 'Europe/London';
const at = (mo: number, d: number, h: number, m = 0) => zonedToMs({ year: 2026, month: mo, day: d, hour: h, minute: m }, LONDON);

describe('backward planner', () => {
    const notBefore = at(10, 20, 9); // Tuesday 20 October, 9 am

    it('finds a fresh plan for Sunday lunch, across the clocks going back', () => {
        const carveAt = at(10, 25, 12, 30);
        const cands = planBackward({ carveAt, zone: LONDON, notBefore });
        const fresh = cands.find((c) => c.category === 'fresh')!;
        expect(fresh).toBeDefined();
        expect(fresh.plan.readyToCarve).toBe(carveAt);
        expect(fresh.quickFeed).toBe(false);
    });

    it('every plan it gives lands on the carve time with nothing in sleeping hours', () => {
        const goals = [at(10, 25, 12, 30), at(10, 24, 8), at(10, 26, 18, 30), at(10, 27, 10, 30), at(10, 23, 20, 30), at(3, 29, 12, 30)];
        for (const carveAt of goals) {
            const start = carveAt - 5 * 24 * HOUR;
            for (const c of planBackward({ carveAt, zone: LONDON, notBefore: start, allowNoFridge: true })) {
                const p = c.plan;
                // Running the levers forward again gives the same plan
                expect(buildPlan(p.levers).readyToCarve).toBe(p.readyToCarve);
                expect(fitsWakingHours(p, { zone: LONDON })).toBe(true);
                expect(p.byId.feed).toBeGreaterThanOrEqual(start);
                // Bulk always counts from the starter going in
                expect(p.bulkEnd - p.byId.starterIn).toBeGreaterThanOrEqual(p.bulkHours * HOUR - 1);
                if (p.levers.fridge.kind === 'hours') {
                    expect(p.fridgeHours).toBeGreaterThanOrEqual(8 - 1e-9);
                    expect(p.fridgeHours).toBeLessThanOrEqual(72 + 1e-9);
                }
                // The starter is in the ready window when it goes in
                expect(p.byId.starterIn).toBeGreaterThanOrEqual(p.starterReadyAt - 1);
                expect(p.byId.starterIn).toBeLessThanOrEqual(p.starterStaleAt + 1);
                expect(violations(p, { zone: LONDON, carveAt }).filter((v) => v.kind !== 'asleep')).toEqual([]);
                if (c.category === 'fresh' || c.category === 'moreFlavour' || c.category === 'noFridge') expect(p.readyToCarve).toBe(carveAt);
                else expect(carveAt - p.byId.out).toBeLessThanOrEqual(16 * HOUR);
            }
        }
    });

    it('offers a bedtime bake for a breakfast carve', () => {
        const carveAt = at(10, 24, 8);
        const bed = planBackward({ carveAt, zone: LONDON, notBefore }).find((c) => c.category === 'bedtime');
        expect(bed).toBeDefined();
        expect(bed!.plan.byId.out).toBeLessThan(carveAt);
        expect(carveAt - bed!.plan.byId.out).toBeLessThanOrEqual(16 * HOUR);
    });

    it('offers a longer fridge time for more flavour', () => {
        const cands = planBackward({ carveAt: at(10, 25, 12, 30), zone: LONDON, notBefore });
        const fresh = cands.find((c) => c.category === 'fresh')!;
        const more = cands.find((c) => c.category === 'moreFlavour');
        if (more) expect(more.plan.fridgeHours).toBeGreaterThanOrEqual(fresh.plan.fridgeHours + 12);
    });

    it('offers no-fridge only when asked', () => {
        // Skipping the fridge only fits a same-day bake: starter in after 6 am, carve in the evening
        const carveAt = at(10, 25, 20, 30);
        expect(planBackward({ carveAt, zone: LONDON, notBefore }).some((c) => c.category === 'noFridge')).toBe(false);
        const none = planBackward({ carveAt, zone: LONDON, notBefore, allowNoFridge: true }).find((c) => c.category === 'noFridge');
        expect(none?.plan.levers.fridge.kind).toBe('none');
    });

    it('gives nothing when there is not enough time', () => {
        expect(planBackward({ carveAt: notBefore + 10 * HOUR, zone: LONDON, notBefore })).toEqual([]);
    });
});

describe('why a kind of plan is not offered', () => {
    const notBefore = at(10, 20, 9);
    const ask = (carveAt: number) => planBackwardWithReasons({ carveAt, zone: LONDON, notBefore });

    it('every kind of plan is either offered or explained, at every quarter hour of the carve slider', () => {
        for (let m = 6 * 60; m <= 23 * 60 + 30; m += 15) {
            const r = ask(at(10, 26, Math.floor(m / 60), m % 60));
            if (r.candidates.length === 0) { expect(r.missing).toEqual([]); continue; }
            const hasFresh = r.candidates.some((c) => c.category === 'fresh');
            // More flavour is a longer-fridge version of baked fresh, so it has nothing to say without one.
            for (const cat of (hasFresh ? ['fresh', 'moreFlavour', 'bedtime'] : ['fresh', 'bedtime']) as Array<'fresh' | 'moreFlavour' | 'bedtime'>) {
                const offered = r.candidates.some((c) => c.category === cat);
                const explained = r.missing.some((x) => x.category === cat);
                expect(offered !== explained, `${cat} at ${m}`).toBe(true);
            }
        }
    });
    it('says nothing when there are no plans at all', () => {
        expect(planBackwardWithReasons({ carveAt: notBefore + 10 * HOUR, zone: LONDON, notBefore })).toEqual({ candidates: [], missing: [] });
    });
    it('a supper carve has no bedtime bake, because the loaf would not wait overnight', () => {
        const r = ask(at(10, 26, 20, 30));
        expect(r.candidates.some((c) => c.category === 'bedtime')).toBe(false);
        expect(r.missing).toContainEqual({ category: 'bedtime', why: 'timeOfDay' });
    });
    it('baked fresh is explained when the oven would have to go on before you are up, while a bedtime bake works', () => {
        const r = ask(at(10, 26, 7));
        expect(r.candidates.some((c) => c.category === 'bedtime')).toBe(true);
        expect(r.missing).toContainEqual({ category: 'fresh', why: 'noFit' });
    });
});
