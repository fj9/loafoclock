import { describe, expect, it } from 'vitest';
import { WAIT_MAX_HOURS, WAIT_MIN_HOURS, bulkFor, feedForWait, leversAt, ratioFor, waitHoursOf } from './levers';
import { fitsWakingHours, violations } from './rules';
import { buildPlan, totalHours } from './steps';
import { HOUR, MINUTE, zonedToMs } from './time';

const LONDON = 'Europe/London';
const at = (d: number, h: number, m = 0, mo = 10) => zonedToMs({ year: 2026, month: mo, day: d, hour: h, minute: m }, LONDON);

describe('bulk table', () => {
    it('uses the closest temperature', () => {
        expect(bulkFor(24).hours).toBe(7);
        expect(bulkFor(21).rise).toBe(75);
        expect(bulkFor(23.4).hours).toBe(8);
        expect(bulkFor(40).hours).toBe(5.5);
        expect(bulkFor(5).hours).toBe(16);
    });
});

describe('forward planner', () => {
    it('the fastest bake: 19 h 30 m with 30 minute cooling, 20 h with 60', () => {
        const p = buildPlan(leversAt(0, { ratioN: 1, doughTemp: 27, cooling: 60, fridge: { kind: 'hours', hours: 8 } }));
        // 4 h feed + 5.5 h bulk + 30 + 15 min shaping + 8 h fridge + 45 min bake + 60 min cooling
        expect(totalHours(p)).toBeCloseTo(4 + 5.5 + 0.5 + 0.25 + 8 + 0.75 + 1, 6);
        const p45 = buildPlan(leversAt(0, { ratioN: 1, doughTemp: 27, cooling: 30, fridge: { kind: 'hours', hours: 8 } }));
        expect(totalHours(p45)).toBeCloseTo(19.5, 6);
    });

    it('puts the steps in order', () => {
        const p = buildPlan(leversAt(at(23, 9)));
        for (let i = 1; i < p.steps.length; i++) expect(p.steps[i]!.at).toBeGreaterThanOrEqual(p.steps[i - 1]!.at);
    });

    it('counts bulk from the starter going in', () => {
        const p = buildPlan(leversAt(0, { doughTemp: 24, autolyseMin: 30, fermentolyseMin: 30 }));
        expect(p.bulkEnd - p.byId.starterIn).toBe(7 * HOUR);
        expect(p.byId.autolyse).toBe(p.byId.starterIn - 30 * MINUTE);
        expect(p.byId.salt).toBe(p.byId.starterIn + 30 * MINUTE);
    });

    it('has four folds half an hour apart, the first half an hour after the salt', () => {
        const p = buildPlan(leversAt(0));
        expect(p.byId.fold1 - p.byId.salt).toBe(30 * MINUTE);
        expect(p.byId.fold4 - p.byId.fold1).toBe(90 * MINUTE);
    });

    it('can skip the fridge and bake after a counter proof', () => {
        const p = buildPlan(leversAt(0, { fridge: { kind: 'none' } }));
        expect(p.byId.bake - p.byId.fridge).toBe(150 * MINUTE);
        expect(p.fridgeHours).toBe(0);
        expect(p.steps.find((s) => s.id === 'fridge')!.label).toBe('Proof on the counter');
    });

    it('carving is the only step that does not need you', () => {
        const p = buildPlan(leversAt(0));
        expect(p.steps.filter((s) => !s.needsYou).map((s) => s.id)).toEqual(['carve']);
    });

    it('a delay to adding the starter moves everything after it', () => {
        const a = buildPlan(leversAt(0));
        const b = buildPlan(leversAt(0, { starterDelayMin: 90 }));
        expect(b.byId.starterIn - a.byId.starterIn).toBe(90 * MINUTE);
        expect(b.readyToCarve - a.readyToCarve).toBe(90 * MINUTE);
        expect(b.byId.feed).toBe(a.byId.feed);
    });

    it('a clock change makes a plan across it an hour different on the wall clock, not in elapsed time', () => {
        // Feed Saturday 24 Oct 9 am. Clocks go back at 2 am on Sunday.
        const p = buildPlan(leversAt(at(24, 9), { ratioN: 3, fridge: { kind: 'hours', hours: 10 } }));
        const hoursElapsed = totalHours(p);
        const wall = (p.readyToCarve - p.byId.feed) / HOUR;
        expect(wall).toBe(hoursElapsed);
        expect(p.fridgeHours).toBe(10);
        // Ten hours after the fridge step is exactly ten elapsed hours even though it crosses 2 am
        expect(p.byId.bake - p.byId.fridge).toBe(10 * HOUR);
    });
});

describe('re-anchoring on what really happened', () => {
    it('a late feed moves the rest of the chain', () => {
        const base = buildPlan(leversAt(0));
        const late = buildPlan(leversAt(0), { feed: 20 * MINUTE });
        expect(late.readyToCarve - base.readyToCarve).toBe(20 * MINUTE);
    });
    it('a late autolyse pushes the starter in, but an early one waits for the starter', () => {
        const base = buildPlan(leversAt(0));
        const late = buildPlan(leversAt(0), { autolyse: base.byId.autolyse + 15 * MINUTE });
        expect(late.byId.starterIn - base.byId.starterIn).toBe(15 * MINUTE);
        const early = buildPlan(leversAt(0), { autolyse: base.byId.autolyse - 15 * MINUTE });
        expect(early.byId.starterIn).toBe(base.byId.starterIn);
    });
    it('the starter going in for real sets the start of bulk', () => {
        const base = buildPlan(leversAt(0));
        const p = buildPlan(leversAt(0), { starterIn: base.byId.starterIn + 40 * MINUTE });
        expect(p.bulkEnd - (base.byId.starterIn + 40 * MINUTE)).toBe(7 * HOUR);
    });
    it('a late fold moves later folds but not the end of bulk', () => {
        const base = buildPlan(leversAt(0));
        const p = buildPlan(leversAt(0), { fold2: base.byId.fold2 + 10 * MINUTE });
        expect(p.byId.fold3 - base.byId.fold3).toBe(10 * MINUTE);
        expect(p.byId.fold4 - base.byId.fold4).toBe(10 * MINUTE);
        expect(p.bulkEnd).toBe(base.bulkEnd);
    });
    it('a fold so late that it would run past the end of bulk pushes bulk out', () => {
        const base = buildPlan(leversAt(0));
        const p = buildPlan(leversAt(0), { fold4: base.bulkEnd + 20 * MINUTE });
        expect(p.bulkEnd).toBe(base.bulkEnd + 50 * MINUTE);
    });
    it('the fridge time stays the same length when you go in late', () => {
        const base = buildPlan(leversAt(0));
        const p = buildPlan(leversAt(0), { fridge: base.byId.fridge + 30 * MINUTE });
        expect(p.fridgeHours).toBe(base.fridgeHours);
        expect(p.byId.bake - base.byId.bake).toBe(30 * MINUTE);
    });
});

describe('rules', () => {
    it('flags steps in sleeping hours', () => {
        // Feed at 9 am Friday with a 1:6:6 feed: autolyse at about 6 pm, fine, but the bake lands at night
        const p = buildPlan(leversAt(at(23, 9), { fridge: { kind: 'hours', hours: 8 } }));
        const v = violations(p, { zone: LONDON });
        expect(v.some((x) => x.kind === 'asleep')).toBe(true);
        expect(fitsWakingHours(p, { zone: LONDON })).toBe(false);
    });
    it('does not flag carving at night', () => {
        const p = buildPlan(leversAt(at(23, 9)));
        expect(violations(p, { zone: LONDON }).every((x) => !(x.kind === 'asleep' && x.stepId === 'carve'))).toBe(true);
    });
    it('rejects a fridge time out of range', () => {
        expect(violations(buildPlan(leversAt(0, { fridge: { kind: 'hours', hours: 6 } })), { zone: 'UTC' }).some((v) => v.kind === 'fridgeRange')).toBe(true);
        expect(violations(buildPlan(leversAt(0, { fridge: { kind: 'hours', hours: 80 } })), { zone: 'UTC' }).some((v) => v.kind === 'fridgeRange')).toBe(true);
    });
    it('limits the rest before carving to 16 hours', () => {
        const p = buildPlan(leversAt(0));
        expect(violations(p, { zone: 'UTC', carveAt: p.byId.out + 16 * HOUR }).some((v) => v.kind === 'restTooLong')).toBe(false);
        expect(violations(p, { zone: 'UTC', carveAt: p.byId.out + 17 * HOUR }).some((v) => v.kind === 'restTooLong')).toBe(true);
    });
});

describe('one slider for the feed', () => {
    it('drifts up through the ratios as the wait grows', () => {
        expect(feedForWait(4).ratioN).toBe(1);
        expect(feedForWait(10)).toEqual({ ratioN: 6, starterDelayMin: 60 });
        expect(feedForWait(16).ratioN).toBe(10);
        let last = 0;
        for (let h = WAIT_MIN_HOURS; h <= WAIT_MAX_HOURS; h += 0.25) {
            const f = feedForWait(h);
            expect(f.ratioN).toBeGreaterThanOrEqual(last);
            last = f.ratioN;
        }
    });
    it('always lands inside the ready window and round-trips', () => {
        for (let h = WAIT_MIN_HOURS; h <= WAIT_MAX_HOURS + 1e-9; h += 0.25) {
            const f = feedForWait(h);
            const r = ratioFor(f.ratioN);
            expect(r.minHours + f.starterDelayMin / 60).toBeGreaterThanOrEqual(r.minHours - 1e-9);
            expect(r.minHours + f.starterDelayMin / 60).toBeLessThanOrEqual(r.maxHours + 1e-9);
            expect(waitHoursOf(f)).toBeCloseTo(h, 6);
        }
    });
    it('clamps outside the range', () => {
        expect(feedForWait(1).ratioN).toBe(1);
        expect(waitHoursOf(feedForWait(99))).toBe(16);
    });
});
