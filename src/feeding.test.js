import { describe, expect, it } from 'vitest';
import { clockAfter, defaultAutolyseFor, feedAt, feedStyle, findRatio, hoursUntil, isAwkwardHour, planAlreadyFed, planFeedForAutolyse, planLimitedStarter } from './feeding.js';

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

describe('planFeedForAutolyse', () => {
    const plan = (feedTime, autolyseAt, extra = {}) => planFeedForAutolyse({ need: 180, feedTime, autolyseAt, ...extra });

    it('feeding at 22:00 for an 08:00 autolyse gives an 11 hour wait and 1:6:6 still fits', () => {
        const p = plan('22:00', '08:00');
        expect(p.gapHours).toBe(11);
        expect(p.best.ratio.ratio).toBe('1:6:6');
    });
    it('moves to a slower ratio when the wait is longer', () => {
        const p = plan('21:00', '08:00'); // 12h: 1:6:6 peaks an hour early
        expect(p.sixOption.status).toBe('tooFast');
        expect(p.sixOption.offHours).toBe(1);
        expect(p.best.ratio.ratio).toBe('1:8:8'); // window centred closest to 12h
    });
    it('moves to a quicker ratio when the wait is shorter', () => {
        const p = plan('23:30', '08:00'); // 9.5h
        expect(p.best.ratio.ratio).toBe('1:6:6');
        const q = plan('01:00', '08:00'); // 8h
        expect(q.best.ratio.ratio).toBe('1:4:4'); // mid 8 is closest, 1:5:5 and 1:3:3 also fit but are further off
    });
    it('counts the autolyse rest as part of the wait', () => {
        expect(plan('22:00', '08:00', { autolyseMin: 40 }).gapHours).toBeCloseTo(10.67, 2);
    });
    it('every ratio is listed with a status', () => {
        const p = plan('22:00', '08:00');
        expect(p.options).toHaveLength(10);
        expect(p.options.find((o) => o.ratio.ratio === '1:1:1').status).toBe('tooFast');
        expect(p.options.find((o) => o.ratio.ratio === '1:10:10').status).toBe('tooSlow');
    });
    it('says when there is too little time, and when to feed by', () => {
        const p = plan('05:00', '08:00'); // 4h wait including the rest... 3 + 1
        expect(p.best.ratio.ratio).toBe('1:1:1');
        const s = plan('06:30', '08:00'); // 2.5h
        expect(s.best).toBeNull();
        expect(s.problem).toMatchObject({ kind: 'tooShort', feedBy: '05:00' });
    });
    it('says when the wait is longer than any ratio covers, and when to feed from', () => {
        const p = plan('08:00', '07:00'); // 24h + 1h
        expect(p.best).toBeNull();
        expect(p.problem).toMatchObject({ kind: 'tooLong', feedFrom: '16:00' });
    });
    it('warns when the starter you have is not enough', () => {
        expect(plan('22:00', '08:00', { have: 10 }).best.notEnoughStarter).toBe(true);  // 1:6:6 needs 14g
        expect(plan('22:00', '08:00', { have: 20 }).best.notEnoughStarter).toBe(false);
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

describe('plain language helpers', () => {
    it('flags the small hours as awkward for planning a start', () => {
        expect(isAwkwardHour('23:00')).toBe(true);
        expect(isAwkwardHour('22:59')).toBe(false);
        expect(isAwkwardHour('03:30')).toBe(true);
        expect(isAwkwardHour('05:59')).toBe(true);
        expect(isAwkwardHour('06:00')).toBe(false);
        expect(isAwkwardHour('08:00')).toBe(false);
    });
    it('calls ratios quick, standard or slow', () => {
        expect(feedStyle(findRatio('1:1:1'))).toBe('quick');
        expect(feedStyle(findRatio('1:3:3'))).toBe('quick');
        expect(feedStyle(findRatio('1:6:6'))).toBe('standard');
        expect(feedStyle(findRatio('1:8:8'))).toBe('slow');
    });
});

describe('defaultAutolyseFor', () => {
    it('suggests a morning autolyse after an evening or night feed', () => {
        expect(defaultAutolyseFor('22:00')).toBe('08:00');
        expect(defaultAutolyseFor('16:00')).toBe('08:00');
        expect(defaultAutolyseFor('02:00')).toBe('08:00');
    });
    it('suggests nine hours on after a daytime feed', () => {
        expect(defaultAutolyseFor('07:30')).toBe('16:30');
        expect(defaultAutolyseFor('10:00')).toBe('19:00');
    });
    it('the suggestion always lets a standard feed fit', () => {
        for (const feed of ['07:30', '10:00', '15:45', '22:00', '00:30']) {
            const p = planFeedForAutolyse({ need: 180, feedTime: feed, autolyseAt: defaultAutolyseFor(feed) });
            expect(p.best, feed).not.toBeNull();
        }
    });
    it('a morning feed with an evening autolyse works out', () => {
        const p = planFeedForAutolyse({ need: 180, feedTime: '07:30', autolyseAt: '17:00' });
        expect(p.best.ratio.ratio).toBe('1:6:6'); // 9.5h + 1h rest = 10.5h
    });
});
