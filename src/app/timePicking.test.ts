import { afterEach, describe, expect, it, vi } from 'vitest';
import { MINUTE, zonedToMs } from '../domain/plan';
import { floorMinute, timeOnDayOf, touchScreen } from './timePicking';

const LONDON = 'Europe/London';
const at = (day: number, hour: number, minute = 0) => zonedToMs({ year: 2026, month: 10, day, hour, minute }, LONDON);

afterEach(() => vi.unstubAllGlobals());

describe('timeOnDayOf', () => {
    const now = at(23, 10, 20);

    it('puts a time that has been on the same day', () => {
        expect(timeOnDayOf(now, 7 * 60 + 40, now, LONDON)).toBe(at(23, 7, 40));
    });

    it('puts a time that has not come yet on the day before', () => {
        expect(timeOnDayOf(now, 20 * 60 + 30, now, LONDON)).toBe(at(22, 20, 30));
    });

    it('counts the day of the moment it is given, so a step done yesterday stays on yesterday', () => {
        expect(timeOnDayOf(at(22, 21), 20 * 60, now, LONDON)).toBe(at(22, 20));
    });

    it('does not push "now" back a day: a minute of leeway', () => {
        expect(timeOnDayOf(now, 10 * 60 + 20, now, LONDON)).toBe(now);
        expect(timeOnDayOf(now, 10 * 60 + 21, now, LONDON)).toBe(at(23, 10, 21));
        expect(timeOnDayOf(now, 10 * 60 + 22, now, LONDON)).toBe(at(22, 10, 22));
    });

    it('is right across the clocks going back on Sunday 25 October', () => {
        const sunday = at(25, 9);
        expect(timeOnDayOf(sunday, 23 * 60, sunday, LONDON)).toBe(at(24, 23));
        expect(timeOnDayOf(sunday, 0 * 60 + 30, sunday, LONDON)).toBe(at(25, 0, 30));
    });
});

describe('floorMinute', () => {
    it('drops the seconds', () => {
        expect(floorMinute(5 * MINUTE + 59_000)).toBe(5 * MINUTE);
    });
});

describe('touchScreen', () => {
    it('is false where the browser cannot say', () => {
        vi.stubGlobal('matchMedia', undefined);
        expect(touchScreen()).toBe(false);
    });

    it('follows a coarse pointer', () => {
        vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('coarse') }));
        expect(touchScreen()).toBe(true);
        vi.stubGlobal('matchMedia', () => ({ matches: false }));
        expect(touchScreen()).toBe(false);
    });
});
