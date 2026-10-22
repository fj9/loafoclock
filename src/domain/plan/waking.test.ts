import { afterEach, describe, expect, it } from 'vitest';
import { planBackward } from './backward';
import { startNowLevers } from './hints';
import { fitsWakingHours } from './rules';
import { buildPlan } from './steps';
import { DEFAULT_WAKING, HOUR, getWaking, isAwake, isValidWaking, setWaking, zonedToMs } from './time';
import { wakingFromSettings } from '../settings';

const LONDON = 'Europe/London';
const at = (mo: number, d: number, h: number, m = 0) => zonedToMs({ year: 2026, month: mo, day: d, hour: h, minute: m }, LONDON);

afterEach(() => setWaking());

describe('waking hours setting', () => {
    it('starts as 6:00 am to 11:00 pm and can be changed', () => {
        expect(getWaking()).toEqual(DEFAULT_WAKING);
        expect(isAwake(at(10, 22, 5, 30), LONDON)).toBe(false);
        setWaking({ fromMin: 5 * 60, toMin: 21 * 60 });
        expect(isAwake(at(10, 22, 5, 30), LONDON)).toBe(true);
        expect(isAwake(at(10, 22, 22), LONDON)).toBe(false);
    });

    it('only accepts sensible hours', () => {
        expect(isValidWaking({ fromMin: 6 * 60, toMin: 23 * 60 })).toBe(true);
        expect(isValidWaking({ fromMin: 4 * 60, toMin: 23 * 60 })).toBe(false);
        expect(isValidWaking({ fromMin: 6 * 60, toMin: 18 * 60 })).toBe(false);
        expect(isValidWaking({ fromMin: 6 * 60, toMin: 25 * 60 })).toBe(false);
        expect(wakingFromSettings({})).toEqual(DEFAULT_WAKING);
        expect(wakingFromSettings({ wakeFrom: 7 * 60, wakeTo: 22 * 60 })).toEqual({ fromMin: 7 * 60, toMin: 22 * 60 });
        expect(wakingFromSettings({ wakeFrom: 60, wakeTo: 22 * 60 })).toEqual(DEFAULT_WAKING);
    });

    it('plans stay inside the hours you set', () => {
        for (const w of [{ fromMin: 7 * 60 + 30, toMin: 21 * 60 + 30 }, { fromMin: 5 * 60, toMin: 23 * 60 + 30 }]) {
            setWaking(w);
            const l = startNowLevers(at(10, 23, 9), {}, LONDON);
            expect(l).not.toBeNull();
            expect(fitsWakingHours(buildPlan(l!), { zone: LONDON })).toBe(true);
            for (const c of planBackward({ carveAt: at(10, 25, 12, 30), zone: LONDON, notBefore: at(10, 20, 9) })) {
                expect(fitsWakingHours(c.plan, { zone: LONDON })).toBe(true);
            }
        }
    });

    it('a narrower day gives fewer options and an earlier bedtime bake', () => {
        const carveAt = at(10, 24, 8);
        const wide = planBackward({ carveAt, zone: LONDON, notBefore: at(10, 20, 9) }).find((c) => c.category === 'bedtime')!;
        setWaking({ fromMin: 7 * 60, toMin: 21 * 60 });
        const narrow = planBackward({ carveAt, zone: LONDON, notBefore: at(10, 20, 9) }).find((c) => c.category === 'bedtime');
        expect(wide).toBeDefined();
        if (narrow) expect(narrow.plan.byId.out).toBeLessThanOrEqual(at(10, 23, 21) + 1);
        expect((carveAt - wide.plan.byId.out) / HOUR).toBeLessThanOrEqual(16);
    });
});
