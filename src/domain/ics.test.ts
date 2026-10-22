import { describe, expect, it } from 'vitest';
import { planToIcs } from './ics';
import { HOUR, buildPlan, leversAt, zonedToMs } from './plan';

const plan = buildPlan(leversAt(zonedToMs({ year: 2026, month: 10, day: 23, hour: 9 }, 'Europe/London'), { fridge: { kind: 'hours', hours: 12 } }));
const NOW = Date.UTC(2026, 9, 21, 12, 0);

describe('calendar file', () => {
    const ics = planToIcs(plan, { now: NOW });
    it('has an event and an alert for every step', () => {
        expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
        expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
        expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(plan.steps.length);
        expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(plan.steps.length);
        expect(ics).toContain('TRIGGER:-PT10M');
        expect(ics).toContain("SUMMARY:Loaf O'Clock: Feed your starter");
    });
    it('writes moments in UTC, across the clocks going back', () => {
        // Feed Fri 23 Oct 9:00 BST is 08:00 UTC
        expect(ics).toContain('DTSTART:20261023T080000Z');
        // Fold 1 is on Saturday 24 Oct; the oven comes on after the clocks go back on Sunday 25th
        const oven = plan.byId.ovenOn;
        expect(ics).toContain(`DTSTART:${new Date(oven).toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`);
    });
    it('has stable ids so an updated file replaces the old events', () => {
        const again = planToIcs(plan, { now: NOW + HOUR });
        const uid = (t: string) => t.match(/UID:.*/g);
        expect(uid(again)).toEqual(uid(ics));
        expect(again).not.toBe(ics);
    });
    it('leaves out steps that are done or past', () => {
        const some = planToIcs(plan, { now: NOW, done: ['feed', 'autolyse'], after: plan.byId.starterIn });
        expect(some).not.toContain('Feed your starter');
        expect(some).not.toContain('Start the autolyse');
        expect(some).toContain('Add the starter');
    });
    it('folds long lines and escapes commas and semicolons', () => {
        for (const line of ics.split('\r\n')) expect(line.length).toBeLessThanOrEqual(75);
        expect(ics).toContain('Add salt\\, honey and oil');
    });
});
