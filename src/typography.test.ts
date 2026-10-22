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

describe('sizes and corners', () => {
    const styles = Object.entries(sources).filter(([file]) => file.endsWith('.css') && !file.endsWith('tokens.css'));

    it('every font size comes from the named sizes, never a number', () => {
        const bad = styles.flatMap(([file, text]) => [...text.matchAll(/font-size:\s*(?!var\(--fs-|inherit|\.7em)[^;}]+/g)].map((m) => `${file}: ${m[0]}`));
        expect(bad).toEqual([]);
    });

    it('every corner radius comes from the named radii, except the 1 and 2 pixel ticks and swatches', () => {
        const bad = styles.flatMap(([file, text]) => [...text.matchAll(/border-radius:\s*(?!var\(--radius-|[12]px\b|50%)[^;}]+/g)].map((m) => `${file}: ${m[0]}`));
        expect(bad).toEqual([]);
    });
});
