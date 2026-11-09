import { useEffect, useState } from 'preact/hooks';
import type { Chapter, Handbook as Book } from '../handbook';
import { Help } from './Help';
import { HtmlBody } from './HtmlBody';

interface Route {
    chapter?: string;
    section?: string;
}

/** The handbook lives at #/handbook, #/handbook/<chapter> and #/handbook/<chapter>/<section>. */
export function handbookRoute(hash: string): Route {
    const m = /^#\/handbook(?:\/([\w-]+))?(?:\/([\w-]+))?/.exec(hash);
    return { chapter: m?.[1], section: m?.[2] };
}

/** The app shows no chapter or section numbers: the contents and the headings are names. */
/** A page of the handbook that is about the app, so it is not in the PDF. It sits in Start here, after the page on using the handbook. */
const APP_PAGE = { id: 'using-the-app', title: 'How to use the app', after: 'how-to-use' };
const heading = (c: Chapter): string => c.title;
/** The contents. The guide is split by what you are doing; every other chapter is placed by its part. */
const GROUPS: ReadonlyArray<{ title: string; parts?: string[]; ids?: string[] }> = [
    { title: 'Start here', parts: ['A'] },
    { title: 'Get ready', ids: ['big-picture', 'ingredients', 'starter', 'percentages', 'flours'] },
    { title: 'Make it', ids: ['recipe', 'process', 'levers', 'timelines', 'flavour'] },
    { title: 'Bake and keep', ids: ['baking', 'variations', 'storing'] },
    { title: 'Fix it', ids: ['troubleshooting', 'food-safety'] },
    { title: 'Worked examples', parts: ['C'] },
    { title: 'Look it up', ids: ['glossary', 'quick-reference'], parts: ['D', 'E'] }
];

/** On a narrow screen the contents fold away under a bar that stays at the top while you read. */
function ContentsBar({ book, current, name }: { book: Book; current: string; name: string }) {
    return (
        <details class="hb-bar" key={current}>
            <summary><span>Contents</span><b>{name}</b></summary>
            <p><a href="#/handbook">Handbook home</a></p>
            <Contents book={book} current={current} />
        </details>
    );
}

function Contents({ book, current }: { book: Book; current?: string }) {
    const [q, setQ] = useState('');
    const needle = q.trim().toLowerCase();
    const match = (c: Chapter) => !needle || c.title.toLowerCase().includes(needle);
    return (
        <nav class="hb-side" aria-label="Handbook contents">
            <input type="search" class="hb-search" placeholder="Search chapters" aria-label="Search chapters" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
            {GROUPS.map((g) => {
                const chapters = book.chapters.filter((c) => (g.ids?.includes(c.id) || g.parts?.includes(c.part)) && match(c));
                return chapters.length === 0 ? null : (
                    <section>
                        <h3>{g.title}</h3>
                        <ul>{chapters.map((c) => (
                            <>
                                <li><a href={`#/handbook/${c.id}`} class={c.id === current ? 'on' : ''} aria-current={c.id === current ? 'page' : undefined}>{heading(c)}</a></li>
                                {c.id === APP_PAGE.after && (!needle || APP_PAGE.title.toLowerCase().includes(needle)) && (
                                    <li><a href={`#/handbook/${APP_PAGE.id}`} class={APP_PAGE.id === current ? 'on' : ''} aria-current={APP_PAGE.id === current ? 'page' : undefined}>{APP_PAGE.title}</a></li>
                                )}
                            </>
                        ))}</ul>
                    </section>
                );
            })}
        </nav>
    );
}

export function Handbook() {
    const [book, setBook] = useState<Book | null>(null);
    const [route, setRoute] = useState<Route>(() => handbookRoute(window.location.hash));
    // The handbook is a separate chunk: it is only fetched (and, after the first visit, cached for offline) when it is opened.
    useEffect(() => { void import('../handbook').then((m) => setBook(m.loadHandbook())); }, []);
    useEffect(() => {
        const onChange = () => setRoute(handbookRoute(window.location.hash));
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);
    useEffect(() => {
        if (!book) return;
        try {
            const target = route.chapter && route.section ? document.getElementById(`${route.chapter}-${route.section}`) : null;
            if (target) target.scrollIntoView(); else window.scrollTo({ top: 0 });
        } catch { /* no scrolling here */ }
    }, [book, route.chapter, route.section]);

    if (!book) return <div class="handbook"><h2>Handbook</h2><p class="hint">Loading…</p></div>;

    const index = book.chapters.findIndex((c) => c.id === route.chapter);
    const chapter = index >= 0 ? book.chapters[index]! : null;

    if (route.chapter === APP_PAGE.id) {
        return (
            <div class="handbook hb-layout">
                <Contents book={book} current={APP_PAGE.id} />
                <div class="hb-main">
                    <ContentsBar book={book} current={APP_PAGE.id} name={APP_PAGE.title} />
                    <p class="hb-back"><a href="#/handbook">Handbook home</a></p>
                    <Help />
                </div>
            </div>
        );
    }

    if (!chapter) {
        return (
            <div class="handbook hb-layout hb-home">
                <Contents book={book} />
                <div class="hb-main">
                    <h2>Handbook</h2>
                    <p>{book.subtitle}</p>
                    <p class="hint">Every time in this handbook is an estimate. Judge each stage by the dough, the starter and the thermometer, not the clock.</p>
                    <div class="hb-quick">
                        <a href="#/handbook/troubleshooting"><b>Fix a problem</b><span>Troubleshooting</span></a>
                        <a href="#/handbook/timelines"><b>Fit it round my day</b><span>Timelines</span></a>
                        <a href="#/handbook/quick-reference"><b>Quick reference</b><span>One-page cheat sheet</span></a>
                    </div>
                    <p class="hb-pdf">
                        Take it with you: <a href="Loaf-o-clock-sourdough-handbook.pdf" download="Loaf-o-clock-sourdough-handbook.pdf">download the handbook as a PDF</a>, or{' '}
                        <a href="Loaf-o-clock-sourdough-handbook-for-ai.pdf" download="Loaf-o-clock-sourdough-handbook-for-ai.pdf">the edition for an AI assistant</a>, to attach to a chat so you can ask questions as you bake.
                    </p>
                </div>
            </div>
        );
    }

    const prev = book.chapters[index - 1];
    const next = book.chapters[index + 1];
    return (
        <div class="handbook hb-layout">
            <Contents book={book} current={chapter.id} />
            <div class="hb-main">
            <ContentsBar book={book} current={chapter.id} name={heading(chapter)} />
            <p class="hb-back"><a href="#/handbook">Handbook home</a></p>
            <h2>{heading(chapter)}</h2>
            {chapter.introHtml && <HtmlBody html={chapter.introHtml} />}
            {chapter.sections.map((s) => (
                <section class="hb-section" id={`${chapter.id}-${s.id}`}>
                    <h3>{s.title}</h3>
                    <HtmlBody html={s.html} />
                </section>
            ))}
            <nav class="hb-pager" aria-label="Chapters">
                {prev ? <a href={`#/handbook/${prev.id}`}>Previous: {prev.title}</a> : <span />}
                {next ? <a href={`#/handbook/${next.id}`}>Next: {next.title}</a> : <span />}
            </nav>
            </div>
        </div>
    );
}
