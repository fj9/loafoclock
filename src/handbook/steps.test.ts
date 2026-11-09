import { describe, expect, it } from 'vitest';
import { FACTS } from './facts';
import { HANDBOOK_FILES } from './files';
import { NUMBERED_STEPS } from '../domain/steps';

const fact = (name: string, arg?: string): string => {
    const f = FACTS[name];
    if (typeof f === 'function') return f(arg ?? '');
    return f!;
};

describe('step facts', () => {
    it('gives numbers, names, the list, the count and the phase', () => {
        expect(fact('stepNumber', 'preShape')).toBe('6');
        expect(fact('stepName', 'finalProof')).toBe('Final proof');
        expect(fact('stepCount')).toBe('10');
        expect(fact('phase', 'bulk')).toBe('steps 3 to 6');
        const list = fact('stepList').split('\n');
        expect(list).toHaveLength(10);
        expect(list[0]).toBe('1. Feed the starter');
        expect(list[9]).toBe('10. Cool and carve');
    });
    it('stops on an unknown key', () => {
        expect(() => fact('stepNumber', 'nope')).toThrow(/no step called "nope"/);
        expect(() => fact('phase', 'nope')).toThrow(/no phase called "nope"/);
    });
});

describe('the process chapter matches data/steps.json', () => {
    const file = Object.entries(HANDBOOK_FILES).find(([p]) => p.endsWith('09-process.md'));
    const text = file?.[1] ?? '';
    const headings = [...text.matchAll(/^## Step (\d+): (.+?)(?: \{([^}]*)\})?\s*$/gm)].map((m) => {
        const attrs = m[3] ?? '';
        const steps = /(?:^|\s)steps=(\S+)/.exec(attrs)?.[1]?.split(',') ?? [];
        return { number: Number(m[1]), name: m[2]!.trim(), steps };
    });

    it('reads 09-process.md', () => expect(text).not.toBe(''));

    it('every "## Step N: Name" heading has the number, name and planner steps of that step', () => {
        expect(headings.length).toBeGreaterThan(0);
        for (const h of headings) {
            const s = NUMBERED_STEPS.find((x) => x.number === h.number);
            expect(s, `step ${h.number} exists`).toBeDefined();
            expect(h.name, `step ${h.number} name`).toBe(s!.name);
            expect([...h.steps].sort(), `step ${h.number} steps=`).toEqual([...s!.covers].sort());
        }
    });

    it('has a heading for every step, and none for the bulk phase', () => {
        expect(headings.map((h) => h.number).sort((a, b) => a - b)).toEqual(NUMBERED_STEPS.map((s) => s.number));
        expect(headings.filter((h) => /bulk/i.test(h.name))).toEqual([]);
    });
});
