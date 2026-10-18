import { describe, expect, it } from 'vitest';
import { clockAfter, feedAt, findRatio, hoursUntil, planDeadline, planLimitedStarter } from './feeding.js';

describe('clock helpers', () => {
    it('adds hours and reports days rolled over', () => {
        expect(clockAfter('21:30', 10)).toEqual({ time: '07:30', days: 1 });
        expect(clockAfter('08:00', 4)).toEqual({ time: '12:00', days: 0 });
    });
    it('counts hours to the next occurrence of a time', () => {
        expect(hoursUntil('09:00', '17:30')).toBe(8.5);
        expect(hoursUntil('21:00', '07:00')).toBe(10);
        expect(hoursUntil('09:00', '09:00')).toBe(24);
    });
});

describe('feedAt', () => {
    it('makes at least the amount needed, with equal flour and water', () => {
        for (const n of [1, 2, 3, 4, 5, 6, 10]) {
            for (const need of [50, 230, 460, 999]) {
                const f = feedAt(n, need);
                expect(f.total).toBeGreaterThanOrEqual(need);
                expect(f.total - f.starter * (1 + 2 * n)).toBe(0);
                expect(f.flour).toBe(f.water);
            }
        }
    });
    it('230g at 1:6:6 needs 18g of starter', () => {
        expect(feedAt(6, 230)).toEqual({ starter: 18, flour: 108, water: 108, total: 234 });
    });
});

describe('planLimitedStarter', () => {
    it('uses 1:6:6 and only as much starter as needed', () => {
        const p = planLimitedStarter({ have: 50, need: 230, feedTime: '21:00' });
        expect(p.ratio.ratio).toBe('1:6:6');
        expect(p.feed.starter).toBe(18);
        expect(p.window.from).toEqual({ time: '06:00', days: 1 });
        expect(p.window.to).toEqual({ time: '08:00', days: 1 });
    });
    it('dilutes just enough when there is too little starter for 1:6:6', () => {
        const p = planLimitedStarter({ have: 30, need: 460, feedTime: '08:00' });
        expect(p.canReach).toBe(true);
        expect(p.diluted).toBe(true);
        expect(p.ratio.ratio).toBe('1:8:8');
        expect(p.feed.starter).toBeLessThanOrEqual(30);
        expect(p.feed.total).toBeGreaterThanOrEqual(460);
    });
    it('says so when even 1:10:10 cannot reach the amount', () => {
        const p = planLimitedStarter({ have: 10, need: 460, feedTime: '08:00' });
        expect(p.canReach).toBe(false);
        expect(p.reachable).toBe(210);
        expect(p.minStarter).toBe(22);
    });
    it('notes when you already have enough', () => {
        expect(planLimitedStarter({ have: 300, need: 230, feedTime: '08:00' }).alreadyEnough).toBe(true);
    });
});

describe('planDeadline', () => {
    it('picks a richer ratio the more time there is', () => {
        const pick = (h) => planDeadline({ need: 230, feedTime: '08:00', neededBy: clockAfter('08:00', h).time }).ratio.ratio;
        expect(pick(5)).toBe('1:1:1');
        expect(pick(8)).toBe('1:4:4');
        expect(pick(12)).toBe('1:8:8');
        expect(pick(15)).toBe('1:10:10');
    });
    it('uses the next day when the deadline clock time is earlier than the feed time', () => {
        const p = planDeadline({ need: 230, feedTime: '21:00', neededBy: '07:00' });
        expect(p.hours).toBe(10);
        expect(p.ratio.ratio).toBe('1:6:6');
    });
    it('flags a deadline that is too soon, or beyond the chart', () => {
        expect(planDeadline({ need: 230, feedTime: '08:00', neededBy: '10:00' }).tooShort).toBe(true);
        expect(planDeadline({ need: 230, feedTime: '08:00', neededBy: '07:00' }).tooLong).toBe(true);
    });
    it('warns if the starter you have is not enough for the ratio', () => {
        const p = planDeadline({ need: 230, feedTime: '08:00', neededBy: '20:00', have: 10 });
        expect(p.notEnoughStarter).toBe(true);
        expect(planDeadline({ need: 230, feedTime: '08:00', neededBy: '20:00', have: 50 }).notEnoughStarter).toBe(false);
    });
});

describe('chart', () => {
    it('keeps the agreed rise times', () => {
        expect(findRatio('1:4:4')).toMatchObject({ minHours: 7, maxHours: 9 });
        expect(findRatio('1:6:6')).toMatchObject({ minHours: 9, maxHours: 11 });
        expect(findRatio('1:10:10')).toMatchObject({ minHours: 13, maxHours: 16 });
    });
});
