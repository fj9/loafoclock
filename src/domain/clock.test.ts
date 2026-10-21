import { afterEach, describe, expect, it } from 'vitest';
import { fmtShort, fmtTime, isClock12, setClock12 } from './clock';

afterEach(() => setClock12(false));

describe('clock formats', () => {
    it('is 24 hour until switched on', () => {
        expect(isClock12()).toBe(false);
        expect(fmtTime('19:30')).toBe('19:30');
    });
    it('writes 12 hour times', () => {
        setClock12(true);
        expect(fmtTime('07:30')).toBe('7:30 am');
        expect(fmtTime('19:30')).toBe('7:30 pm');
        expect(fmtTime('00:00')).toBe('12:00 am');
        expect(fmtTime('12:05')).toBe('12:05 pm');
        expect(fmtTime('')).toBe('');
    });
    it('writes short forms for buttons', () => {
        setClock12(true);
        expect(fmtShort('07:00')).toBe('7 am');
        expect(fmtShort('22:00')).toBe('10 pm');
        expect(fmtShort('18:30')).toBe('6:30 pm');
        setClock12(false);
        expect(fmtShort('07:00')).toBe('07:00');
    });
});
