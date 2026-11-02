// The handbook as one printable HTML page, for turning into a PDF. Two editions come from the same chapters:
// the reader's, and one with the briefing for an AI assistant added.
import type { Chapter, Handbook, Part } from './compile';

export type Edition = 'reader' | 'ai';

/** Links inside the printed handbook point at ids in the same page. */
export const printHref = (chapterId: string, sectionId?: string): string => `#${sectionId ? `${chapterId}--${sectionId}` : chapterId}`;

export interface PrintOptions {
    edition: Edition;
    /** "2 November 2026". */
    date: string;
    /** Where the heading font can be read from, as a URL. Left out, the headings use a serif. */
    fontUrl?: string;
    /** Draws a worked example (as HTML) from its settings. Left out, examples are left as they are. */
    renderFigure?: (spec: string) => string;
    /** The app's own styles, so the examples look as they do in the app. */
    appCss?: string;
}

const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
@page { size: A4; margin: 18mm 16mm 20mm; @bottom-center { content: counter(page); font: 9pt sans-serif; color: #6B5B51; } }
@page :first { @bottom-center { content: none; } }
* { box-sizing: border-box; }
body { margin: 0; font: 10.5pt/1.5 -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-variant-ligatures: none; color: #2B211C; }
h1, h2, h3 { font-family: 'Alfa Slab One', Georgia, 'Times New Roman', serif; font-weight: 400; color: #9A4A22; break-after: avoid; }
h1 { font-size: 22pt; margin: 0 0 6pt; } h2 { font-size: 16pt; margin: 18pt 0 6pt; } h3 { font-size: 12pt; margin: 14pt 0 4pt; }
a { color: #9A4A22; text-decoration: none; }
p, ul, ol, blockquote { margin: 0 0 7pt; } ul, ol { padding-left: 18pt; } li { margin-bottom: 2pt; }
blockquote { padding: 6pt 10pt; background: #F4EBDA; border-left: 3pt solid #C98F66; }
table { border-collapse: collapse; margin: 0 0 9pt; font-size: 9.5pt; break-inside: avoid; }
th, td { border: 0.5pt solid #C9B79B; padding: 3pt 6pt; text-align: left; vertical-align: top; } th { background: #F4EBDA; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
.cover h1 { font-size: 34pt; line-height: 1.1; } .cover .sub { font-size: 13pt; margin: 8pt 0 24pt; }
.cover .box { padding: 8pt 12pt; margin: 0 0 8pt; background: #F4EBDA; border: 0.5pt solid #C9B79B; }
.cover .meta { margin-top: 20pt; color: #6B5B51; font-size: 9.5pt; }
.toc { break-after: page; } .toc h2 { margin-top: 0; } .toc h3 { margin: 12pt 0 3pt; font-size: 11pt; }
.toc ul { list-style: none; padding: 0; } .toc li { margin: 0; }
.part { break-before: page; } .chapter { margin-top: 10pt; }
.num { color: #6B5B51; }
.hb-plan { break-inside: auto; margin: 6pt 0 12pt; padding: 8pt; border: 0.5pt solid #C9B79B; border-radius: 6pt; } .hb-plan .rail li { break-inside: avoid; }
`;

const chapterHeading = (c: Chapter): string => (/^\d|^A\d/.test(c.number) ? `${c.number}. ${c.title}` : c.title);

function renderChapter(c: Chapter, heading: 'h1' | 'h2', withHeading: boolean): string {
    const sections = c.sections.map((s) => `<h3 id="${c.id}--${s.id}">${s.number ? `<span class="num">${s.number}</span> ` : ''}${escape(s.title)}</h3>\n${s.html}`).join('\n');
    return `<section class="chapter" id="${c.id}">${withHeading ? `<${heading}>${escape(chapterHeading(c))}</${heading}>` : ''}\n${c.introHtml}\n${sections}\n</section>`;
}

function renderPart(part: Part, chapters: Chapter[]): string {
    if (chapters.length === 0) return '';
    // A part with a single chapter (the worked example, the quick answers) is that chapter: one heading, not two.
    if (chapters.length === 1) {
        const c = chapters[0]!;
        return `<div class="part" id="part-${part.id}"><h1>Part ${part.id}: ${escape(c.title)}</h1>\n${renderChapter(c, 'h2', false)}</div>`;
    }
    return `<div class="part" id="part-${part.id}"><h1>Part ${part.id}: ${escape(part.title)}</h1><p>${escape(part.intro)}</p>\n${chapters.map((c) => renderChapter(c, 'h2', true)).join('\n')}</div>`;
}

const drawFigures = (html: string, render?: (spec: string) => string): string =>
    render ? html.replace(/<div class="hb-figure" data-plan="([^"]+)"><\/div>/g, (_all, spec: string) => render(spec)) : html;

export function buildPrintHtml(book: Handbook, options: PrintOptions): string {
    const chapters = book.chapters.filter((c) => options.edition === 'ai' || c.audience === 'all');
    const parts = book.parts.map((p) => ({ part: p, chapters: chapters.filter((c) => c.part === p.id) })).filter((p) => p.chapters.length > 0);
    const font = options.fontUrl ? `@font-face { font-family: 'Alfa Slab One'; src: url('${options.fontUrl}'); }` : '';
    const boxes = options.edition === 'ai'
        ? `<div class="box"><strong>For an AI assistant reading this document:</strong> this is a reference handbook for a home baker who is finding sourdough difficult. Before answering any question, read <a href="${printHref('ai-briefing')}">the briefing for the AI assistant</a>. It explains how to use this handbook, which questions to ask the baker, and how to answer.</div>
<div class="box"><strong>For the baker:</strong> read <a href="${printHref('how-to-use')}">how to use this handbook</a>, then attach this file to a chat with an AI assistant and paste the starter message.</div>`
        : '';
    const toc = parts.map(({ part, chapters: cs }) => `<h3>Part ${part.id}: ${cs.length === 1 ? `<a href="#${cs[0]!.id}">${escape(cs[0]!.title)}</a>` : escape(part.title)}</h3>\n${cs.length === 1 ? '' : `<ul>${cs.map((c) => `<li><a href="#${c.id}">${escape(chapterHeading(c))}</a></li>`).join('')}</ul>`}`).join('\n');
    return `<!doctype html>
<html lang="en-GB" data-theme="light"><head><meta charset="utf-8"><title>${escape(book.title)}${options.edition === 'ai' ? ' (for an AI assistant)' : ''}</title>
<style>${font}${options.appCss ?? ''}${CSS}</style></head><body>
<div class="cover"><h1>${escape(book.title)}</h1><p class="sub">${escape(book.subtitle)}</p>
${boxes}
<p class="meta">From the Loaf O'Clock app. Compiled ${escape(options.date)}. All times and temperatures are estimates: judge by the dough, not the clock.</p></div>
<div class="toc"><h2>Contents</h2>\n${toc}</div>
${drawFigures(parts.map((p) => renderPart(p.part, p.chapters)).join('\n'), options.renderFigure)}
</body></html>
`;
}
