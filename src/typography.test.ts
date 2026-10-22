import { describe, expect, it } from 'vitest';

// Every source and style file in the app, as text.
const sources = import.meta.glob('./**/*.{ts,tsx,css}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// The curly single and double quotes, written as escapes so this file does not contain them itself.
const curly = new RegExp('[\\u2018\\u2019\\u201C\\u201D]');

describe('typography', () => {
    it('uses straight apostrophes and quotes everywhere in the app, never curly ones', () => {
        expect(Object.keys(sources).length).toBeGreaterThan(20);
        const bad = Object.entries(sources).filter(([, text]) => curly.test(text)).map(([file]) => file);
        expect(bad).toEqual([]);
    });
});
