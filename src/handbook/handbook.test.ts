import { describe, expect, it } from 'vitest';
import { BULK_TABLE, STEP_ORDER } from '../domain/plan';
import { compileHandbook, sectionsForStep } from './compile';
import { FACTS } from './facts';
import { HANDBOOK_FILES } from './files';

const compile = () => compileHandbook(HANDBOOK_FILES, { facts: FACTS, href: (c, s) => `#${c}${s ? `-${s}` : ''}` });

describe('the handbook content', () => {
    it('compiles: every fact, link and step it names exists', () => {
        const book = compile();
        expect(book.chapters.length).toBeGreaterThan(15);
        for (const c of book.chapters) expect(c.sections.length + c.introHtml.length).toBeGreaterThan(0);
    });

    it('has straight apostrophes and quotes, never curly ones', () => {
        const curly = new RegExp('[\\u2018\\u2019\\u201C\\u201D]');
        const bad = Object.entries(HANDBOOK_FILES).filter(([, text]) => curly.test(text)).map(([file]) => file);
        expect(bad).toEqual([]);
    });

    it('has no em dashes', () => {
        const bad = Object.entries(HANDBOOK_FILES).filter(([, text]) => text.includes('—')).map(([file]) => file);
        expect(bad).toEqual([]);
    });

    it('helps with every step of the planner', () => {
        const book = compile();
        const missing = STEP_ORDER.filter((id) => sectionsForStep(book, id).length === 0);
        expect(missing).toEqual([]);
    });

    it('quotes the same bulk chart as the planner', () => {
        const html = compile().chapters.find((c) => c.id === 'process')!.sections.find((s) => s.id === 'bulk')!.html;
        for (const row of BULK_TABLE) expect(html).toContain(`<td>${row.temp}°C</td>`);
        expect(html).toContain('<td>75%</td>');
        expect(html).not.toContain('<td>30%</td>');
    });

    it('keeps the briefing for an AI assistant out of the chapters the app shows', async () => {
        const { loadHandbook } = await import('./index');
        expect(compile().chapters.some((c) => c.id === 'ai-briefing')).toBe(true);
        expect(loadHandbook().chapters.some((c) => c.id === 'ai-briefing')).toBe(false);
    });

    it('has no dates or days of the week: examples count Day 1, Day 2', () => {
        const dated = /\b(Mon|Tues?|Wed(nes)?|Thu(rs)?|Fri|Sat(ur)?|Sun)(day)?\b|\b(January|February|March|April|June|July|August|September|October|November|December)\b|\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;
        const bad = Object.entries(HANDBOOK_FILES).flatMap(([file, text]) => text.split('\n').filter((l) => dated.test(l)).map((l) => `${file}: ${l.slice(0, 80)}`));
        expect(bad).toEqual([]);
    });

    it('draws each worked example, all within waking hours', () => {
        const all = compile().chapters.flatMap((c) => [c.introHtml, ...c.sections.map((s) => s.html)]).join('\n');
        const figures = [...all.matchAll(/class="hb-figure" data-plan="([^"]+)"/g)];
        expect(figures.length).toBeGreaterThanOrEqual(7);
    });

    it('rejects an unknown fact, link or step', () => {
        const meta = { 'x/handbook.json': JSON.stringify({ title: 't', subtitle: 's', parts: [{ id: 'B', title: 'b', intro: '' }] }) };
        const chapter = (body: string) => ({ ...meta, 'x/01-a.md': `---\nid: a\nnumber: 1\ntitle: A\npart: B\n---\n\n${body}\n` });
        const opts = { facts: FACTS, href: () => '#' };
        expect(() => compileHandbook(chapter('{{nope}}'), opts)).toThrow(/unknown fact/);
        expect(() => compileHandbook(chapter('[[nowhere]]'), opts)).toThrow(/not a chapter/);
        expect(() => compileHandbook(chapter('## Hi {steps=nope}\n\ntext'), opts)).toThrow(/unknown step/);
        expect(() => compileHandbook(chapter('## Hi {steps=fold1}\n\nsee [[a#hi]] and {{bulk 24}}'), opts)).not.toThrow();
    });
});
