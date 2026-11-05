import { describe, expect, it } from 'vitest';
import { hoursRangeProse, hoursRangeText } from './levers';

describe('hoursRangeProse', () => {
    it('spells half hours out and keeps whole hours as digits', () => {
        expect(hoursRangeProse({ minHours: 3, maxHours: 5 })).toBe('3 to 5 hours');
        expect(hoursRangeProse({ minHours: 4.5, maxHours: 6.5 })).toBe('4 and a half to 6 and a half hours');
        expect(hoursRangeProse({ minHours: 2.5, maxHours: 3.5 })).toBe('2 and a half to 3 and a half hours');
    });

    it('handles mixed whole and half ends', () => {
        expect(hoursRangeProse({ minHours: 1.5, maxHours: 2 })).toBe('1 and a half to 2 hours');
        expect(hoursRangeProse({ minHours: 3, maxHours: 4.5 })).toBe('3 to 4 and a half hours');
    });

    it('handles a half hour', () => {
        expect(hoursRangeProse({ minHours: 0.5, maxHours: 1 })).toBe('half an hour to 1 hour');
        expect(hoursRangeProse({ minHours: 0.5, maxHours: 2 })).toBe('half an hour to 2 hours');
        expect(hoursRangeProse({ minHours: 0.5, maxHours: 0.5 })).toBe('half an hour');
        expect(hoursRangeProse({ minHours: 2, maxHours: 2 })).toBe('2 hours');
    });

    it('leaves the app helper on decimals', () => {
        expect(hoursRangeText({ minHours: 4.5, maxHours: 6.5 })).toBe('4.5 to 6.5');
    });
});
