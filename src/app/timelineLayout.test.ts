import { describe, expect, it } from 'vitest';
import { BREAK_PX, MIN_BREAK_HOURS, layoutTimeline } from './timelineLayout';
import { HOUR, buildPlan, leversAt } from '../domain/plan';

const plan = (fridge: { kind: 'hours'; hours: number } | { kind: 'none' }, over = {}) => buildPlan(leversAt(0, { fridge, ...over }));

describe('timeline layout', () => {
    it('folds a long fridge stretch into a break and fits the width', () => {
        const p = plan({ kind: 'hours', hours: 18.5 });
        const l = layoutTimeline(p, 340);
        expect(l.pieces.map((q) => q.collapsed)).toEqual([false, true, false]);
        expect(l.x(l.end)).toBeCloseTo(340, 6);
        expect(l.x(l.start)).toBe(0);
        expect(l.pieces[1]!.x1 - l.pieces[1]!.x0).toBe(BREAK_PX);
    });

    it('keeps the busy hours at the same scale on both sides of the break', () => {
        const p = plan({ kind: 'hours', hours: 18.5 });
        const l = layoutTimeline(p, 340);
        const a = l.x(p.byId.fold2) - l.x(p.byId.fold1);
        expect(a / 0.5).toBeCloseTo(l.pxPerHour, 6);
        const b = l.x(p.byId.out) - l.x(p.byId.bake);
        expect(b / ((p.byId.out - p.byId.bake) / HOUR)).toBeCloseTo(l.pxPerHour, 6);
    });

    it('folds even the shortest fridge stretch, but not a counter proof', () => {
        expect(MIN_BREAK_HOURS).toBeLessThanOrEqual(8); // the fridge is never shorter than 8 hours
        const short = layoutTimeline(plan({ kind: 'hours', hours: 8 }, {}), 340);
        expect(short.pieces.some((q) => q.collapsed)).toBe(true);
        const none = layoutTimeline(plan({ kind: 'none' }), 340);
        expect(none.pieces).toHaveLength(1);
        expect(none.x(none.end)).toBeCloseTo(340, 6);
    });

    it('moves right as time moves on, and always stays inside the width', () => {
        for (const hours of [8, 16, 40, 72]) for (const width of [280, 340, 600]) {
            const p = plan({ kind: 'hours', hours });
            const l = layoutTimeline(p, width);
            let last = -1;
            for (const s of p.steps) {
                expect(l.x(s.at)).toBeGreaterThanOrEqual(last);
                expect(l.x(s.at)).toBeLessThanOrEqual(width + 1e-6);
                last = l.x(s.at);
            }
        }
    });

    it('places a moment inside the break in proportion', () => {
        const p = plan({ kind: 'hours', hours: 20 });
        const l = layoutTimeline(p, 340);
        const mid = (p.byId.fridge + p.byId.ovenOn) / 2;
        const brk = l.pieces[1]!;
        expect(l.x(mid)).toBeCloseTo((brk.x0 + brk.x1) / 2, 6);
    });
});
