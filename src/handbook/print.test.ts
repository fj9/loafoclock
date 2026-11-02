import { describe, expect, it } from 'vitest';
import { compileHandbook } from './compile';
import { FACTS } from './facts';
import { HANDBOOK_FILES } from './files';
import { buildPrintHtml, printHref, type Edition } from './print';

const book = compileHandbook(HANDBOOK_FILES, { facts: FACTS, href: printHref });
const html = (edition: Edition) => buildPrintHtml(book, { edition, date: '2 November 2026' });

describe('the printed handbook', () => {
    it('leaves the briefing for an AI assistant out of the reader\'s edition and puts it in the other', () => {
        expect(html('reader')).not.toContain('Briefing for the AI assistant');
        expect(html('reader')).not.toContain('For an AI assistant reading this document');
        expect(html('ai')).toContain('Briefing for the AI assistant');
        expect(html('ai')).toContain('For an AI assistant reading this document');
    });

    it('has every other chapter in both editions', () => {
        for (const c of book.chapters.filter((x) => x.audience === 'all')) {
            expect(html('reader')).toContain(`id="${c.id}"`);
            expect(html('ai')).toContain(`id="${c.id}"`);
        }
    });

    it('only links to things that are in the same edition', () => {
        for (const edition of ['reader', 'ai'] as const) {
            const page = html(edition);
            const ids = new Set([...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
            const missing = [...page.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]!).filter((id) => !ids.has(id));
            expect(missing).toEqual([]);
        }
    });

    it('draws the worked examples when it is given the means to', () => {
        const page = buildPrintHtml(book, { edition: 'reader', date: 'today', renderFigure: (spec) => ({ top: `<p data-drawn="${spec.length}">top</p>`, side: '<p>side</p>' }) });
        expect(page).not.toContain('class="hb-figure"');
        expect((page.match(/<p data-drawn/g) ?? []).length).toBeGreaterThanOrEqual(5);
    });

    it('quotes the same bulk chart as the app', () => {
        expect(html('reader')).toContain('<td>3–5</td>');
        expect(html('reader')).toContain('<td>75%</td>');
    });
});
