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
    /**
     * Draws a worked example (as HTML) from its settings, in two pieces: the ready-to-carve bar and timeline, which run the
     * full width, and the steps rail, which goes in a narrow column beside the text that follows. Left out, examples are left as they are.
     */
    renderFigure?: (spec: string) => { top: string; side: string };
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
.hb-plan { margin: 6pt 0 8pt; padding: 0; border: 0; break-inside: avoid; } .hb-plan .np-bar { margin: 0 0 5pt; padding: 5pt 12pt; } .hb-plan .np-when { font-size: 12pt; } .hb-plan .timeline { margin: 0 0 4pt; } .hb-plan .tl-track { height: 132px; } .hb-plan .tl-sleep span { display: none; }
.hb-plan figcaption { margin: 0 0 4pt; font-size: 8.5pt; color: #6B5B51; }
.example { break-before: page; break-after: page; margin-top: 0; } .example h2 { margin: 0 0 4pt; font-size: 14pt; }
.example > p { margin-bottom: 5pt; }
.example .fig-grid { grid-template-columns: 56mm minmax(0, 1fr); column-gap: 6mm; margin-bottom: 0; }
.example .fig-text { font-size: 8.6pt; line-height: 1.32; } .example .fig-text h3 { font-size: 9.5pt; margin: 6pt 0 2pt; } .example .fig-text p, .example .fig-text ul, .example .fig-text ol { margin-bottom: 3pt; } .example .fig-text li { margin-bottom: 1pt; }
.example .fig-text table { font-size: 8pt; } .example .fig-text th, .example .fig-text td { padding: 1.5pt 4pt; }
.example .hb-plan { margin: 4pt 0 6pt; } .example .fig-text .hb-plan { margin: 4pt 0; } .example .fig-text figcaption { font-size: 7.5pt; margin: 0 0 2pt; }
.example .hb-plan .timeline { margin: 0 0 2pt; }
.example .step-no { display: inline; margin-left: 4px; font-size: 6.5pt; color: #8A7A6E; }
.example .compact .rl-gap { min-height: 5px; } .example .compact .rl-label { font-size: 8pt; line-height: 1.2; } .example .compact .rl-day { padding: 4px 0 1px; }
.example > p:first-of-type { font-size: 9.5pt; line-height: 1.4; }
.part-list { margin: 10pt 0 0; } .part-list li { margin-bottom: 7pt; }
.fig-grid { display: grid; grid-template-columns: 62mm 1fr; column-gap: 8mm; align-items: start; margin-bottom: 8pt; }
.fig-side { break-inside: avoid; } .fig-text > :first-child { margin-top: 0; }
.compact .rail { margin: 0; } .compact .rl-row, .compact .rl-gap { grid-template-columns: 44px 14px 1fr; column-gap: 4px; }
.compact .rl-gap { height: auto !important; min-height: 12px; } .compact .rl-night { display: none; }
.compact .rl-time, .compact .rl-wait, .compact .rl-day { font-size: 7pt; } .compact .rl-label { font-size: 8.5pt; line-height: 1.25; }
.compact .rl-day { padding: 7px 0 2px; } .compact .rl-day::after { top: 3px; }
.compact .rl-dot { width: 10px; height: 10px; border-width: 1.5px; margin-top: 2px; } .compact .rl-time { padding-top: 1px; white-space: nowrap; }
`;

const chapterHeading = (c: Chapter): string => (/^[AC]?\d/.test(c.number) ? `${c.number}. ${c.title}` : c.title);

/**
 * A worked example is laid out to fill one page: the bar across the top, with the choices in a line beneath it, then the steps down the left with all
 * of the chapter's writing beside them. It starts on a new page.
 */
function renderExample(c: Chapter, render: NonNullable<PrintOptions['renderFigure']>, heading: string): string | null {
    const figs = c.sections.map((s) => { const m = FIGURE.exec(s.html); return m ? { m, r: render(m[1]!) } : null; });
    const main = figs.findIndex((f) => f && f.r.side);
    if (main < 0) return null;
    const text = c.sections.map((s, i) => {
        const f = figs[i];
        const html = f ? s.html.replace(f.m[0], i === main ? '' : `<figure class="hb-plan">${f.r.top}</figure>`) : s.html;
        const title = i === main ? `<a id="${c.id}--${s.id}"></a>` : `<h3 id="${c.id}--${s.id}">${escape(s.title)}</h3>`;
        return `${title}\n${html}`;
    }).join('\n');
    const intro = c.introHtml.replace(SETTINGS_CARDS, '');
    return `<section class="chapter example" id="${c.id}">${heading}\n${intro}\n<figure class="hb-plan">${figs[main]!.r.top}</figure><div class="fig-grid"><div class="fig-side compact">${figs[main]!.r.side}</div><div class="fig-text">${text}</div></div></section>`;
}

function renderChapter(c: Chapter, heading: 'h1' | 'h2', withHeading: boolean, render?: PrintOptions['renderFigure']): string {
    if (render) {
        const example = renderExample(c, render, withHeading ? `<${heading}>${escape(chapterHeading(c))}</${heading}>` : '');
        if (example) return example;
    }
    const sections = c.sections.map((s) => `<h3 id="${c.id}--${s.id}">${s.number ? `<span class="num">${s.number}</span> ` : ''}${escape(s.title)}</h3>\n${drawFigure(s.html, render)}`).join('\n');
    return `<section class="chapter" id="${c.id}">${withHeading ? `<${heading}>${escape(chapterHeading(c))}</${heading}>` : ''}\n${c.introHtml.replace(SETTINGS_CARDS, '')}\n${sections}\n</section>`;
}

function renderPart(part: Part, chapters: Chapter[], render?: PrintOptions['renderFigure']): string {
    if (chapters.length === 0) return '';
    // A part with a single chapter (the worked example, the quick answers) is that chapter: one heading, not two.
    if (chapters.length === 1) {
        const c = chapters[0]!;
        return `<div class="part" id="part-${part.id}"><h1>Part ${part.id}: ${escape(c.title)}</h1>\n${renderChapter(c, 'h2', false, render)}</div>`;
    }
    // A part of worked examples gets a page of its own with a list, and each example starts on a page after it.
    const isExample = (c: Chapter) => FIGURE.test(c.sections.map((s) => s.html).join(''));
    const firstSentence = (c: Chapter): string => (/^(.+?[.!?])(?:\s|$)/.exec(c.introHtml.replace(SETTINGS_CARDS, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())?.[1] ?? '');
    const list = render && chapters.some(isExample) ? `<ul class="part-list">${chapters.map((c) => `<li><a href="#${c.id}"><strong>${escape(chapterHeading(c))}</strong></a>. ${escape(firstSentence(c))}</li>`).join('')}</ul>` : '';
    return `<div class="part" id="part-${part.id}"><h1>Part ${part.id}: ${escape(part.title)}</h1><p>${escape(part.intro)}</p>${list}\n${chapters.map((c) => renderChapter(c, 'h2', true, render)).join('\n')}</div>`;
}

/** The cards of choices at the top of a worked example are for the app: the printed figure has them as a line of text. */
const SETTINGS_CARDS = /<div class="hb-settings-fig" data-plan="[^"]+"><\/div>\n?/g;
const FIGURE = /<div class="hb-figure" data-plan="([^"]+)"><\/div>/;

/** A section with a worked example: text, then the bar across the page, then the rail down the left with the rest of the text beside it. */
function drawFigure(html: string, render?: (spec: string) => { top: string; side: string }): string {
    const m = render ? FIGURE.exec(html) : null;
    if (!render || !m) return html;
    const { top, side } = render(m[1]!);
    const before = html.slice(0, m.index);
    const after = html.slice(m.index + m[0].length);
    if (!side) return `${before}<figure class="hb-plan">${top}</figure>${after}`;
    return `${before}<figure class="hb-plan">${top}</figure><div class="fig-grid"><div class="fig-side compact">${side}</div><div class="fig-text">${after}</div></div>`;
}

export function buildPrintHtml(book: Handbook, options: PrintOptions): string {
    const chapters = book.chapters.filter((c) => options.edition === 'ai' || c.audience === 'all');
    const parts = book.parts.map((p) => ({ part: p, chapters: chapters.filter((c) => c.part === p.id) })).filter((p) => p.chapters.length > 0);
    const font = options.fontUrl ? `@font-face { font-family: 'Alfa Slab One'; src: url('${options.fontUrl}'); }` : '';
    const boxes = options.edition === 'ai'
        ? `<div class="box"><strong>For an AI assistant reading this document:</strong> this is a reference handbook for a home baker who is finding sourdough difficult. Before answering any question, read <a href="${printHref('ai-briefing')}">the briefing for the AI assistant</a>. It explains how to use this handbook, which questions to ask the baker, and how to answer.</div>
<div class="box"><strong>For the baker:</strong> read <a href="${printHref('ai-using')}">using this handbook with an AI assistant</a>, then attach this file to a chat with an AI assistant and paste the starter message.</div>`
        : '';
    const toc = parts.map(({ part, chapters: cs }) => `<h3>Part ${part.id}: ${cs.length === 1 ? `<a href="#${cs[0]!.id}">${escape(cs[0]!.title)}</a>` : escape(part.title)}</h3>\n${cs.length === 1 ? '' : `<ul>${cs.map((c) => `<li><a href="#${c.id}">${escape(chapterHeading(c))}</a></li>`).join('')}</ul>`}`).join('\n');
    return `<!doctype html>
<html lang="en-GB" data-theme="light"><head><meta charset="utf-8"><title>${escape(book.title)}${options.edition === 'ai' ? ' (for an AI assistant)' : ''}</title>
<style>${font}${options.appCss ?? ''}${CSS}</style></head><body>
<div class="cover"><h1>${escape(book.title)}</h1><p class="sub">${escape(book.subtitle)}</p>
${boxes}
<p class="meta">From the Loaf O'Clock app. Compiled ${escape(options.date)}. All times and temperatures are estimates: judge by the dough, not the clock.</p></div>
<div class="toc"><h2>Contents</h2>\n${toc}</div>
${parts.map((p) => renderPart(p.part, p.chapters, options.renderFigure)).join('\n')}
</body></html>
`;
}
