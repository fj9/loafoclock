import { describe, expect, it } from 'vitest';
import {
    DAY, HOUR, MINUTE, addLocalDays, atLocalTime, ceilTo, isAwake, localDayNumber, minutesOfDay,
    partsOf, startOfLocalDay, zonedToMs
} from './time';

const LONDON = 'Europe/London';
// In 2026 the UK clocks go forward on Sunday 29 March and back on Sunday 25 October.

describe('zoned time', () => {
    it('reads the wall clock in a zone', () => {
        // 21:00 UTC on Saturday 24 October is 22:00 in London (still summer time)
        const ms = Date.UTC(2026, 9, 24, 21, 0);
        expect(partsOf(ms, LONDON)).toMatchObject({ year: 2026, month: 10, day: 24, hour: 22, minute: 0 });
        // and on Sunday 25 October, after the clocks go back, 21:00 UTC is 21:00
        expect(partsOf(Date.UTC(2026, 9, 25, 21, 0), LONDON).hour).toBe(21);
    });

    it('builds a moment from a local date and time, on either side of a clock change', () => {
        expect(zonedToMs({ year: 2026, month: 10, day: 24, hour: 22 }, LONDON)).toBe(Date.UTC(2026, 9, 24, 21, 0));
        expect(zonedToMs({ year: 2026, month: 10, day: 25, hour: 22 }, LONDON)).toBe(Date.UTC(2026, 9, 25, 22, 0));
        expect(zonedToMs({ year: 2026, month: 7, day: 1, hour: 12 }, 'UTC')).toBe(Date.UTC(2026, 6, 1, 12, 0));
    });

    it('round-trips through the local clock', () => {
        for (const [y, mo, d, h, mi] of [[2026, 10, 24, 22, 15], [2026, 10, 26, 6, 0], [2026, 3, 28, 23, 30], [2026, 3, 30, 7, 5]] as const) {
            const ms = zonedToMs({ year: y, month: mo, day: d, hour: h, minute: mi }, LONDON);
            expect(partsOf(ms, LONDON)).toMatchObject({ year: y, month: mo, day: d, hour: h, minute: mi });
        }
    });

    it('a night with the clocks going back is 25 hours long, going forward 23', () => {
        const back = zonedToMs({ year: 2026, month: 10, day: 24, hour: 22 }, LONDON);
        const nextBack = zonedToMs({ year: 2026, month: 10, day: 25, hour: 22 }, LONDON);
        expect((nextBack - back) / HOUR).toBe(25);
        const fwd = zonedToMs({ year: 2026, month: 3, day: 28, hour: 22 }, LONDON);
        const nextFwd = zonedToMs({ year: 2026, month: 3, day: 29, hour: 22 }, LONDON);
        expect((nextFwd - fwd) / HOUR).toBe(23);
    });

    it('adds calendar days while keeping the wall-clock time', () => {
        const sat = zonedToMs({ year: 2026, month: 10, day: 24, hour: 22 }, LONDON);
        const sun = addLocalDays(sat, 1, LONDON);
        expect(partsOf(sun, LONDON)).toMatchObject({ day: 25, hour: 22 });
        expect(sun - sat).toBe(DAY + HOUR); // 25 elapsed hours
    });

    it('finds minutes of the day, the date number and the start of the day', () => {
        const ms = zonedToMs({ year: 2026, month: 10, day: 25, hour: 13, minute: 30 }, LONDON);
        expect(minutesOfDay(ms, LONDON)).toBe(13 * 60 + 30);
        expect(localDayNumber(ms, LONDON)).toBe(localDayNumber(ms + 3 * HOUR, LONDON));
        expect(partsOf(startOfLocalDay(ms, LONDON), LONDON)).toMatchObject({ day: 25, hour: 0, minute: 0 });
        expect(partsOf(atLocalTime(ms, 8 * 60, LONDON), LONDON)).toMatchObject({ day: 25, hour: 8, minute: 0 });
    });

    it('rounds up to a grid', () => {
        expect(ceilTo(61 * MINUTE, 30 * MINUTE)).toBe(90 * MINUTE);
        expect(ceilTo(60 * MINUTE, 30 * MINUTE)).toBe(60 * MINUTE);
    });
});

describe('waking hours', () => {
    const at = (h: number, m = 0) => zonedToMs({ year: 2026, month: 10, day: 20, hour: h, minute: m }, LONDON);
    it('are 6:00 am to 11:00 pm, both included', () => {
        expect(isAwake(at(6), LONDON)).toBe(true);
        expect(isAwake(at(23), LONDON)).toBe(true);
        expect(isAwake(at(5, 59), LONDON)).toBe(false);
        expect(isAwake(at(23, 1), LONDON)).toBe(false);
        expect(isAwake(at(3), LONDON)).toBe(false);
        expect(isAwake(at(12), LONDON)).toBe(true);
    });
    it('follow the local clock, not UTC', () => {
        // 05:30 UTC in summer is 06:30 in London: awake. In winter it is 05:30: asleep.
        expect(isAwake(Date.UTC(2026, 6, 1, 5, 30), LONDON)).toBe(true);
        expect(isAwake(Date.UTC(2026, 11, 1, 5, 30), LONDON)).toBe(false);
    });
});
