import { describe, expect, it } from 'vitest';
import { clockAfter, feedAt, findRatio, hoursUntil, planAlreadyFed, planFromAutolyse, planLimitedStarter } from './feeding.js';

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

describe('planFromAutolyse', () => {
    const plan = (earliestFeed, extra = {}) => planFromAutolyse({ need: 230, autolyseAt: '07:00', earliestFeed, ...extra });

    it('recommends 1:6:6, fed 8 hours before autolyse, when there is time', () => {
        const p = plan('21:00');
        expect(p.recommended.ratio.ratio).toBe('1:6:6');
        expect(p.recommended.feedTime).toEqual({ time: '23:00', days: -1 });
        expect(p.quicker).toBe(false);
    });

    it('starter is at its earliest peak when it is added an hour after autolyse starts', () => {
        const p = plan('21:00');
        expect(p.recommended.window.from).toEqual({ time: '08:00', days: 0 });
        expect(p.recommended.window.to).toEqual({ time: '10:00', days: 0 });
    });

    it('feeds as late as possible, not as soon as you can', () => {
        expect(plan('12:00').recommended.feedTime.time).toBe('23:00');
    });

    it('steps down to a quicker ratio when pushed for time', () => {
        const p = plan('02:00'); // 5h to autolyse + 1h = 6h
        expect(p.recommended.ratio.ratio).toBe('1:3:3');
        expect(p.recommended.feedTime).toEqual({ time: '02:00', days: 0 });
        expect(p.quicker).toBe(true);
    });

    it('uses 1:1:1 when it is the only thing that fits', () => {
        const p = plan('04:00');
        expect(p.recommended.ratio.ratio).toBe('1:1:1');
        expect(p.recommended.feed.starter).toBe(77);
    });

    it('has no recommendation when even 1:1:1 is too slow', () => {
        const p = plan('05:00');
        expect(p.recommended).toBeNull();
        expect(p.shortestHours).toBe(4);
    });

    it('lists every ratio up to 1:6:6, marking which are possible', () => {
        const p = plan('02:00');
        expect(p.options.map((o) => [o.ratio.ratio, o.possible])).toEqual([
            ['1:6:6', false], ['1:5:5', false], ['1:4:4', false], ['1:3:3', true], ['1:2:2', true], ['1:1:1', true]
        ]);
    });

    it('treats the same clock time as a full day away', () => {
        expect(plan('07:00').availableHours).toBe(25);
    });

    it('warns when the starter you have is not enough for a ratio', () => {
        const p = plan('21:00', { have: 10 });
        expect(p.options.find((o) => o.ratio.ratio === '1:6:6').notEnoughStarter).toBe(true);
        expect(p.options.find((o) => o.ratio.ratio === '1:1:1').notEnoughStarter).toBe(true);
        expect(plan('21:00', { have: 80 }).options.every((o) => !o.notEnoughStarter)).toBe(true);
    });
});

describe('chart', () => {
    it('keeps the agreed rise times', () => {
        expect(findRatio('1:4:4')).toMatchObject({ minHours: 7, maxHours: 9 });
        expect(findRatio('1:6:6')).toMatchObject({ minHours: 9, maxHours: 11 });
        expect(findRatio('1:10:10')).toMatchObject({ minHours: 13, maxHours: 16 });
    });
});

describe('planAlreadyFed', () => {
    it('gives the ready window from the feed time and ratio', () => {
        const p = planAlreadyFed({ feedTime: '17:00', ratio: '1:6:6' });
        expect(p.window.from).toEqual({ time: '02:00', days: 1 });
        expect(p.window.to).toEqual({ time: '04:00', days: 1 });
    });
    it('rejects a ratio that is not in the chart', () => {
        expect(() => planAlreadyFed({ feedTime: '17:00', ratio: '1:7:8' })).toThrow();
    });
});
