import { describe, expect, it } from 'vitest';
import { guideFor, recipeOf } from './stepGuide';
import { buildPlan, leversAt, STEP_ORDER } from './plan';

const clock = (ms: number) => `t${ms}`;
const plan = (over = {}) => buildPlan(leversAt(0, { fridge: { kind: 'hours', hours: 12 }, ...over }));

describe('step guide', () => {
    it('has a guide for every step', () => {
        const p = plan();
        for (const id of STEP_ORDER) {
            const g = guideFor(id, p, clock);
            expect(g.title.length).toBeGreaterThan(0);
            expect(g.instructions.length).toBeGreaterThan(0);
        }
    });

    it('uses the amounts for the loaves you chose', () => {
        expect(recipeOf(plan().levers)).toMatchObject({ flour: 450, starter: 150, water: 300 });
        const two = plan({ loaves: 2, size: 'large' });
        expect(recipeOf(two.levers)).toMatchObject({ flour: 1200, starter: 400 });
        expect(guideFor('autolyse', two, clock).ingredients[0]).toBe('1200g flour');
        expect(guideFor('starterIn', two, clock).ingredients).toEqual(['400g active starter']);
    });

    it('works out the feed so there is starter to keep back', () => {
        const g = guideFor('feed', plan({ ratioN: 6 }), clock);
        // 150 + 30 = 180 needed at 1:6:6 = 14g starter, 84g flour, 84g water
        expect(g.ingredients).toEqual(['14g starter, straight from the fridge', '84g flour', '84g water']);
        expect(g.note).toContain('182g');
    });

    it('offers timers for the rests, the folds, the preheat and the cooling', () => {
        const p = plan({ autolyseMin: 30, cooling: 30 });
        expect(guideFor('autolyse', p, clock).timerMinutes).toBe(30);
        expect(guideFor('fold2', p, clock).timerMinutes).toBe(30);
        expect(guideFor('ovenOn', p, clock).timerMinutes).toBe(45);
        expect(guideFor('out', p, clock).timerMinutes).toBe(30);
        expect(guideFor('autolyse', p, clock).instructions[1]).toContain('30 minutes');
    });

    it('mentions inclusions on the last fold only', () => {
        const p = plan();
        expect(guideFor('fold4', p, clock).instructions.join(' ')).toContain('inclusions');
        expect(guideFor('fold1', p, clock).instructions.join(' ')).not.toContain('inclusions');
    });

    it('describes skipping the fridge, and the bake for the size', () => {
        const none = buildPlan(leversAt(0, { fridge: { kind: 'none' } }));
        expect(guideFor('fridge', none, clock).title).toBe('Proof on the counter');
        expect(guideFor('bake', plan({ size: 'large' }), clock).instructions.join(' ')).toContain('25 minutes (lid on)');
    });
});
