import { describe, expect, it } from 'vitest';
import { bulkHoursBeforeRemaining, clampRest, firstFoldMinutes, restEnd, restText, tidyRest } from './timing.js';

describe('tidyRest', () => {
    it('keeps the full hour when it already ends on the half hour', () => {
        expect(tidyRest('10:30')).toEqual({ minutes: 60, end: { time: '11:30', days: 0 } });
        expect(tidyRest('10:00').minutes).toBe(60);
    });
    it('shortens the rest to end on the hour', () => {
        expect(tidyRest('10:20')).toEqual({ minutes: 40, end: { time: '11:00', days: 0 } });
    });
    it('prefers the longer of the two tidy end times', () => {
        expect(tidyRest('10:10').minutes).toBe(50); // 11:00, not 10:40
        expect(tidyRest('10:35').minutes).toBe(55); // 11:30
    });
    it('stays within 30 to 60 minutes for every start minute, and always ends on :00 or :30', () => {
        for (let m = 0; m < 1440; m++) {
            const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
            const { minutes, end } = tidyRest(t);
            expect(minutes).toBeGreaterThanOrEqual(30);
            expect(minutes).toBeLessThanOrEqual(60);
            expect(['00', '30']).toContain(end.time.slice(3));
        }
    });
    it('rolls past midnight', () => {
        expect(tidyRest('23:20').end).toEqual({ time: '00:00', days: 1 });
    });
});

describe('rest helpers', () => {
    it('clamps to 30-60', () => {
        expect(clampRest(10)).toBe(30);
        expect(clampRest(90)).toBe(60);
        expect(clampRest('45')).toBe(45);
        expect(clampRest('')).toBe(0 + 30); // empty becomes 0, which clamps up
        expect(clampRest('abc')).toBe(60);
    });
    it('words the length', () => {
        expect(restText(60)).toBe('1 hour');
        expect(restText(45)).toBe('45 minutes');
    });
    it('finds the end time', () => {
        expect(restEnd('10:20', 40)).toEqual({ time: '11:00', days: 0 });
    });
    it('moves the first fold and the bulk maths with the fermentolyse length', () => {
        expect(firstFoldMinutes(60)).toBe(90);
        expect(firstFoldMinutes(40)).toBe(70);
        expect(bulkHoursBeforeRemaining(60)).toBe(3);
        expect(bulkHoursBeforeRemaining(30)).toBe(2.5);
    });
});
