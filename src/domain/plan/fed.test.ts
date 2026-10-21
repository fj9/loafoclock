import { describe, expect, it } from 'vitest';
import { fedActuals, fedLevers, minDelayFor, starterState } from './fed';
import { fitsWakingHours } from './rules';
import { buildPlan } from './steps';
import { HOUR, zonedToMs } from './time';

const LONDON = 'Europe/London';
const at = (mo: number, d: number, h: number, m = 0) => zonedToMs({ year: 2026, month: mo, day: d, hour: h, minute: m }, LONDON);

const fedAt = at(10, 22, 20);  // Thursday evening, 1:6:6 (ready in 9 to 12 hours)
const now = at(10, 23, 8);     // Friday morning

describe('starter state', () => {
    it('is rising, ready, then past', () => {
        expect(starterState(fedAt, 6, fedAt + 2 * HOUR)).toBe('rising');
        expect(starterState(fedAt, 6, fedAt + 10 * HOUR)).toBe('ready');
        expect(starterState(fedAt, 6, fedAt + 20 * HOUR)).toBe('past');
    });
});

describe('minimum wait', () => {
    it('is nothing when the autolyse can start after now anyway', () => {
        expect(minDelayFor(fedAt, 6, 60, fedAt)).toBe(0);
    });
    it('keeps the autolyse from starting in the past', () => {
        const delay = minDelayFor(fedAt, 6, 60, now);
        const plan = buildPlan({ ...fedLevers(fedAt, 6, now, {}, LONDON)!, starterDelayMin: delay }, fedActuals(fedAt));
        expect(plan.byId.autolyse).toBeGreaterThanOrEqual(now);
        // and one step less would not
        const less = buildPlan({ ...plan.levers, starterDelayMin: delay - 15 }, fedActuals(fedAt));
        expect(delay === 0 || less.byId.autolyse < now).toBe(true);
    });
});

describe('levers for a starter already fed', () => {
    it('keep the feed as it was and start no earlier than now', () => {
        const l = fedLevers(fedAt, 6, now, {}, LONDON)!;
        expect(l).not.toBeNull();
        expect(l.feedAt).toBe(fedAt);
        expect(l.ratioN).toBe(6);
        const p = buildPlan(l, fedActuals(fedAt));
        expect(p.byId.feed).toBe(fedAt);
        expect(p.byId.autolyse).toBeGreaterThanOrEqual(now);
    });

    it('keep every step after the feed in waking hours', () => {
        const l = fedLevers(fedAt, 6, now, {}, LONDON)!;
        const p = buildPlan(l, fedActuals(fedAt));
        expect(fitsWakingHours({ ...p, steps: p.steps.filter((s) => s.id !== 'feed') }, { zone: LONDON })).toBe(true);
    });
});
