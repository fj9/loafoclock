import { describe, expect, it } from 'vitest';
import { PLAN_DEFAULTS, buildSchedule, bulkFor, eventMs, feedAnchorMs } from './schedule.js';

const base = { feedTime: '21:00', riseMinHours: 9 }; // 1:6:6 fed at 21:00
const times = (s) => Object.fromEntries(s.events.map((e) => [e.key, e.clock]));

describe('bulkFor', () => {
    it('finds the closest temperature in the chart', () => {
        expect(bulkFor(24)).toMatchObject({ hours: 7, rise: 50 });
        expect(bulkFor(21)).toMatchObject({ hours: 12, rise: 75 });
        expect(bulkFor(30).temp).toBe(27);
        expect(bulkFor(10).temp).toBe(18);
    });
});

describe('buildSchedule with the defaults', () => {
    const s = buildSchedule(base);
    const t = times(s);

    it('starts autolyse an hour before the starter is ready', () => {
        expect(t.feed).toEqual({ time: '21:00', days: 0 });
        expect(t.autolyse).toEqual({ time: '05:00', days: 1 });
        expect(t.starterIn).toEqual({ time: '06:00', days: 1 });
    });
    it('adds salt after the fermentolyse, then folds 30 min apart', () => {
        expect(t.salt).toEqual({ time: '07:00', days: 1 });
        expect(t.folds).toEqual({ time: '07:30', days: 1 });
        expect(s.events.find((e) => e.key === 'folds').until).toEqual({ time: '09:00', days: 1 });
    });
    it('ends bulk after 7 hours at 24C, then shapes and chills', () => {
        expect(t.bulkEnd).toEqual({ time: '13:00', days: 1 });
        expect(t.finalShape).toEqual({ time: '13:30', days: 1 });
        expect(t.fridge).toEqual({ time: '13:45', days: 1 });
    });
    it('bakes at 08:00 the next morning, with the oven on 45 min before', () => {
        expect(t.bake).toEqual({ time: '08:00', days: 2 });
        expect(t.oven).toEqual({ time: '07:15', days: 2 });
        expect(t.out).toEqual({ time: '08:50', days: 2 });
        expect(s.fridgeHours).toBe(18.25);
    });
    it('lists every milestone in order', () => {
        const mins = s.events.map((e) => e.minutes);
        expect(mins).toEqual([...mins].sort((a, b) => a - b));
        expect(s.events.map((e) => e.stepId)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10]);
    });
});

describe('buildSchedule with a planned autolyse', () => {
    it('uses the autolyse time you chose, and adds the starter when that rest ends', () => {
        // fed 22:00, autolyse 08:00 next day, 1h rest: starter in at 09:00
        const s = buildSchedule({ feedTime: '22:00', riseMinHours: 9, plannedAutolyse: '08:00' });
        const t = times(s);
        expect(t.autolyse).toEqual({ time: '08:00', days: 1 });
        expect(t.starterIn).toEqual({ time: '09:00', days: 1 });
        expect(t.bulkEnd).toEqual({ time: '16:00', days: 1 });
    });
    it('follows a shorter autolyse rest', () => {
        const t = times(buildSchedule({ feedTime: '22:00', riseMinHours: 9, plannedAutolyse: '08:00', autolyseMin: 40 }));
        expect(t.starterIn).toEqual({ time: '08:40', days: 1 });
    });
});

describe('buildSchedule options', () => {
    it('a shorter autolyse moves the autolyse start later', () => {
        expect(times(buildSchedule({ ...base, autolyseMin: 40 })).autolyse).toEqual({ time: '05:20', days: 1 });
    });
    it('a cooler dough lengthens the bulk', () => {
        const cool = times(buildSchedule({ ...base, doughTemp: 21 }));
        expect(cool.bulkEnd).toEqual({ time: '18:00', days: 1 });
    });
    it('never ends bulk before the last fold', () => {
        const s = buildSchedule({ ...base, doughTemp: 27, fermentolyseMin: 60 });
        const folds = s.events.find((e) => e.key === 'folds');
        expect(s.events.find((e) => e.key === 'bulkEnd').minutes).toBeGreaterThanOrEqual(folds.minutes + 90);
    });
    it('keeps at least 8 hours in the fridge by moving the bake a day on', () => {
        const s = buildSchedule({ ...base, bakeAt: '18:00' }); // fridge 13:45 -> 18:00 is only 4h
        expect(times(s).bake).toEqual({ time: '18:00', days: 2 });
        expect(s.fridgeHours).toBeGreaterThanOrEqual(PLAN_DEFAULTS.minFridgeHours);
    });
    it('extra fridge days push the bake out and flag over 72 hours', () => {
        const two = buildSchedule({ ...base, extraFridgeDays: 2 });
        expect(times(two).bake).toEqual({ time: '08:00', days: 4 });
        expect(two.tooLongInFridge).toBe(false); // 66h
        const three = buildSchedule({ ...base, extraFridgeDays: 3 });
        expect(times(three).bake).toEqual({ time: '08:00', days: 5 });
        expect(three.tooLongInFridge).toBe(true); // 90h
    });
    it('uses the bake length of the loaf for when the loaf comes out', () => {
        const s = buildSchedule({ ...base, bakeMinutes: 45 });
        expect(times(s).out).toEqual({ time: '08:45', days: 2 });
    });
    it('follows what actually happened when you add the starter late', () => {
        const s = buildSchedule({ ...base, actuals: { starterIn: '06:30' } });
        expect(times(s).starterIn).toEqual({ time: '06:30', days: 1 });
        expect(times(s).bulkEnd).toEqual({ time: '13:30', days: 1 });
    });
    it('follows the actual end of bulk', () => {
        const s = buildSchedule({ ...base, actuals: { bulkEnd: '12:00' } });
        expect(times(s).bulkEnd).toEqual({ time: '12:00', days: 1 });
        expect(times(s).fridge).toEqual({ time: '12:45', days: 1 });
    });
});

describe('feedAnchorMs', () => {
    const at = (h, m = 0) => new Date(2026, 9, 18, h, m).getTime(); // Sunday 18 Oct 2026
    const hm = (ms) => { const d = new Date(ms); return `${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    it('a feed later tonight is tonight', () => {
        expect(hm(feedAnchorMs('22:00', at(19, 40)))).toBe('18 22:00');
    });
    it('a feed you did earlier today is today', () => {
        expect(hm(feedAnchorMs('17:00', at(19, 40)))).toBe('18 17:00');
    });
    it('a morning feed chosen in the evening is tomorrow morning', () => {
        expect(hm(feedAnchorMs('07:30', at(19, 40)))).toBe('19 07:30');
    });
    it('a small-hours feed chosen after midnight is tonight, not tomorrow', () => {
        expect(hm(feedAnchorMs('23:00', at(0, 30)))).toBe('17 23:00');
    });
    it('puts events at the right moments', () => {
        const s = buildSchedule({ feedTime: '22:00', riseMinHours: 9 });
        const anchor = feedAnchorMs('22:00', at(19, 40));
        const autolyse = s.events.find((e) => e.key === 'autolyse');
        expect(hm(eventMs(anchor, autolyse))).toBe('19 06:00');
    });
});
