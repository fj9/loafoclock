import { describe, expect, it } from 'vitest';
import { STEP_TIPS, TIPS, tipHtml } from './tips.js';

describe('tips', () => {
    it('every tip has a label and plain text of a sensible length', () => {
        for (const [key, t] of Object.entries(TIPS)) {
            expect(t.label, key).toBeTruthy();
            expect(t.text.length, key).toBeGreaterThan(40);
            expect(t.text.length, key).toBeLessThan(260);
        }
    });
    it('every step has a tip, and every step tip exists', () => {
        expect(Object.keys(STEP_TIPS)).toHaveLength(10);
        for (const key of Object.values(STEP_TIPS)) expect(TIPS[key]).toBeTruthy();
    });
    it('links the button to its tooltip, with a unique id each time', () => {
        const a = tipHtml('ratio');
        const b = tipHtml('ratio');
        const id = (h) => h.match(/aria-describedby="([^"]+)"/)[1];
        expect(a).toContain(`id="${id(a)}"`);
        expect(id(a)).not.toBe(id(b));
        expect(a).toContain('role="tooltip"');
    });
    it('rejects unknown keys', () => {
        expect(() => tipHtml('nope')).toThrow();
    });
});
