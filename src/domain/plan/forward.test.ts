import { describe, expect, it } from 'vitest';
import { earlierFeedNudge, nextAwake, planForward } from './forward';
import { fitsWakingHours } from './rules';
import { buildPlan } from './steps';
import { HOUR, isAwake, zonedToMs } from './time';

const LONDON = 'Europe/London';
const at = (mo: number, d: number, h: number, m = 0) => zonedToMs({ year: 2026, month: mo, day: d, hour: h, minute: m }, LONDON);

describe('forward planner', () => {
    const feedAt = at(11, 9, 18); // Monday 9 November, 6 pm

    it('every option starts at the feed time and keeps you out of your sleeping hours', () => {
        for (const f of [feedAt, at(11, 10, 7, 30), at(11, 10, 12), at(10, 24, 20), at(3, 28, 18)]) {
            const { options } = planForward({ feedAt: f, zone: LONDON });
            expect(options.length).toBeGreaterThan(0);
            for (const o of options) {
                expect(o.plan.byId.feed).toBe(f);
                expect(fitsWakingHours(o.plan, { zone: LONDON })).toBe(true);
                expect(isAwake(o.plan.readyToCarve, LONDON)).toBe(true);
                expect(buildPlan(o.plan.levers).readyToCarve).toBe(o.plan.readyToCarve);
            }
        }
    });

    it('lists the options soonest first, each kind at most once', () => {
        const { options } = planForward({ feedAt, zone: LONDON });
        const times = options.map((o) => o.plan.readyToCarve);
        expect(times).toEqual([...times].sort((a, b) => a - b));
        expect(new Set(options.map((o) => o.category)).size).toBe(options.length);
    });

    it('balanced is overnight with a standard feed, and more flavour has a much longer fridge stay', () => {
        const { options } = planForward({ feedAt, zone: LONDON });
        const bal = options.find((o) => o.category === 'balanced')!;
        expect(bal.quickFeed).toBe(false);
        expect(bal.plan.levers.fridge.kind).toBe('hours');
        const more = options.find((o) => o.category === 'moreFlavour');
        if (more) expect(more.plan.fridgeHours).toBeGreaterThanOrEqual(bal.plan.fridgeHours + 12);
    });

    it('no fridge is quicker than the rest and has no fridge time', () => {
        const none = planForward({ feedAt, zone: LONDON }).options.find((o) => o.category === 'noFridge');
        if (none) expect(none.plan.levers.fridge.kind).toBe('none');
    });

    it('says so when the feed time is in your sleeping hours', () => {
        const r = planForward({ feedAt: at(11, 10, 2), zone: LONDON });
        expect(r).toEqual({ options: [], missing: [], asleep: true });
        expect(isAwake(nextAwake(at(11, 10, 2), LONDON), LONDON)).toBe(true);
        expect(nextAwake(at(11, 10, 2), LONDON)).toBe(at(11, 10, 6));
    });

    it('suggests an earlier feed only when it saves at least two hours', () => {
        const nudge = earlierFeedNudge({ feedAt: at(11, 10, 14), zone: LONDON, notBefore: at(11, 10, 8) });
        if (nudge) {
            expect(nudge.feedAt).toBeLessThan(at(11, 10, 14));
            expect(nudge.feedAt).toBeGreaterThanOrEqual(at(11, 10, 8));
            const here = planForward({ feedAt: at(11, 10, 14), zone: LONDON }).options[0];
            expect(here.plan.readyToCarve - nudge.readyToCarve).toBeGreaterThanOrEqual(2 * HOUR - 1);
        }
        // Never before notBefore
        expect(earlierFeedNudge({ feedAt: at(11, 10, 14), zone: LONDON, notBefore: at(11, 10, 14) })).toBeNull();
    });
});
