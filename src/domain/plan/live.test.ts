import { describe, expect, it } from 'vitest';
import { leversAt } from './levers';
import { keepBakeTime, lockedLevers, reconcile, tick, untick, withKeptBakeTime } from './live';
import { buildPlan } from './steps';
import { HOUR, MINUTE } from './time';

const levers = leversAt(0, { fridge: { kind: 'hours', hours: 12 } });
const original = buildPlan(levers);

describe('live view', () => {
    it('before the start, the feed is next and everything is upcoming', () => {
        const v = reconcile(original, levers, {}, -HOUR);
        expect(v.next!.id).toBe('feed');
        expect(v.untilNext).toBe(HOUR);
        expect(v.steps.every((s) => s.status === 'upcoming')).toBe(true);
        expect(v.keepBakeTime).toBeNull();
    });

    it('marks due, then overdue, and counts down in negative', () => {
        expect(reconcile(original, levers, {}, 5 * MINUTE).next!.status).toBe('due');
        const late = reconcile(original, levers, {}, 25 * MINUTE);
        expect(late.next!.status).toBe('overdue');
        expect(late.untilNext).toBe(-25 * MINUTE);
        expect(late.freeMs).toBe(0);
    });

    it('nothing completes by itself: time passing never marks a step done', () => {
        const v = reconcile(original, levers, {}, original.readyToCarve + 100 * HOUR);
        expect(v.steps.filter((s) => s.status === 'done')).toHaveLength(0);
    });

    it('ticking moves on to the next step and reports the shift', () => {
        const a = tick({}, 'feed', 20 * MINUTE);
        const v = reconcile(original, levers, a, 30 * MINUTE);
        expect(v.steps[0]!.status).toBe('done');
        expect(v.next!.id).toBe('autolyse');
        expect(v.steps.find((s) => s.id === 'autolyse')!.shiftMin).toBe(20);
        expect(v.steps[0]!.shiftMin).toBe(20);
    });

    it('shows how long you are free before the next step', () => {
        const v = reconcile(original, levers, tick({}, 'feed', 0), 30 * MINUTE);
        expect(v.freeMs).toBe(original.byId.autolyse - 30 * MINUTE);
    });

    it('each fold is its own tick', () => {
        let a = {};
        for (const id of ['feed', 'autolyse', 'starterIn', 'salt', 'fold1'] as const) a = tick(a, id, original.byId[id]);
        a = tick(a, 'fold2', original.byId.fold2 + 10 * MINUTE);
        const v = reconcile(original, levers, a, original.byId.fold2 + 11 * MINUTE);
        expect(v.next!.id).toBe('fold3');
        expect(v.steps.find((s) => s.id === 'fold3')!.shiftMin).toBe(10);
        expect(v.steps.find((s) => s.id === 'fold4')!.shiftMin).toBe(10);
    });

    it('can take a tick back', () => {
        const a = tick({}, 'feed', 0);
        expect(untick(a, 'feed')).toEqual({});
        expect(a).toEqual({ feed: 0 });
    });
});

describe('keep my bake time', () => {
    it('offers a shorter fridge time when you are late', () => {
        const a = tick({}, 'fridge', original.byId.fridge + 90 * MINUTE);
        const v = reconcile(original, levers, a, original.byId.fridge + 91 * MINUTE);
        expect(v.keepBakeTime).toEqual({ fridgeHours: 10.5, possible: true });
        const kept = reconcile(original, withKeptBakeTime(levers, v.keepBakeTime!), a, original.byId.fridge + 91 * MINUTE);
        expect(kept.plan.byId.bake).toBe(original.byId.bake);
        expect(kept.plan.readyToCarve).toBe(original.readyToCarve);
    });

    it('says when that would go below 8 hours', () => {
        const a = tick({}, 'fridge', original.byId.fridge + 5 * HOUR);
        const k = reconcile(original, levers, a, original.byId.fridge + 5 * HOUR).keepBakeTime!;
        expect(k.possible).toBe(false);
        expect(withKeptBakeTime(levers, k).fridge).toEqual({ kind: 'hours', hours: 8 });
    });

    it('offers nothing when nothing has slipped, or without a fridge', () => {
        expect(keepBakeTime(original, original)).toBeNull();
        const none = buildPlan({ ...levers, fridge: { kind: 'none' } });
        expect(keepBakeTime(none, buildPlan({ ...none.levers }, { fridge: none.byId.fridge + HOUR }))).toBeNull();
    });
});

describe('locks', () => {
    it('lock levers as their steps happen', () => {
        expect(lockedLevers({})).toEqual({ startTime: false, feedRatio: false, doughTemp: false, fridge: false, cooling: false });
        expect(lockedLevers({ feed: 0 })).toMatchObject({ feedRatio: true, startTime: true, doughTemp: false });
        expect(lockedLevers({ feed: 0, preShape: 5 })).toMatchObject({ doughTemp: true, fridge: false });
        expect(lockedLevers({ ovenOn: 5 }).fridge).toBe(true);
    });
    it('editing the fridge after locking re-times what has not happened', () => {
        const a = tick({}, 'feed', 0);
        const edited = { ...levers, fridge: { kind: 'hours', hours: 20 } } as const;
        const v = reconcile(original, edited, a, HOUR);
        expect(v.plan.fridgeHours).toBe(20);
        expect(v.steps.find((s) => s.id === 'bake')!.shiftMin).toBe(8 * 60);
    });
});
