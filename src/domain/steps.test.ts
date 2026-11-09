import { describe, expect, it } from 'vitest';
import data from '../../data/steps.json';
import { STEP_ORDER } from './plan';
import { NUMBERED_STEPS, PHASES, STEP_BY_PLANNER_ID, STEP_COUNT, phaseOf, stepName, stepNumber } from './steps';

describe('data/steps.json', () => {
    it('numbers run 1 to 10 with no gaps, in order', () => {
        expect(NUMBERED_STEPS.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(STEP_COUNT).toBe(10);
        expect(new Set(NUMBERED_STEPS.map((s) => s.key)).size).toBe(STEP_COUNT);
    });

    it('every planner step belongs to exactly one step, and none is listed twice', () => {
        const listed = NUMBERED_STEPS.flatMap((s) => s.covers);
        expect(new Set(listed).size).toBe(listed.length);
        for (const id of STEP_ORDER) expect(listed.filter((x) => x === id), id).toHaveLength(1);
        for (const id of listed) expect(STEP_ORDER as readonly string[], id).toContain(id);
    });

    it('covers follow the planner order, so numbers never go backwards along the timeline', () => {
        const numbers = STEP_ORDER.map((id) => STEP_BY_PLANNER_ID[id]!.number);
        expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    });

    it('phases start and end on real steps, start first', () => {
        expect(PHASES.length).toBeGreaterThan(0);
        for (const p of data.phases) {
            const keys = NUMBERED_STEPS.map((s) => s.key);
            expect(keys, p.key).toContain(p.from);
            expect(keys, p.key).toContain(p.to);
            expect(stepNumber(p.from), p.key).toBeLessThan(stepNumber(p.to));
            expect(keys, 'a phase is not a step').not.toContain(p.key);
        }
    });

    it('looks steps up', () => {
        expect(STEP_BY_PLANNER_ID.fold3!.number).toBe(5);
        expect(STEP_BY_PLANNER_ID.ovenOn!.number).toBe(9);
        expect(STEP_BY_PLANNER_ID.carve!.number).toBe(10);
        expect(stepName('finalProof')).toBe('Final proof');
        expect(phaseOf('bulk').from).toBe('starterIn');
        expect(() => stepNumber('nope')).toThrow(/no step called "nope"/);
    });
});
