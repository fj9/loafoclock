import { describe, expect, it } from 'vitest';
import { STEP_TIPS, TIPS } from './tips';

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
});
