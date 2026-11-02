import { useEffect, useState } from 'preact/hooks';
import type { Chapter, Handbook as Book } from '../handbook';

interface Route {
    chapter?: string;
    section?: string;
}

/** The handbook lives at #/handbook, #/handbook/<chapter> and #/handbook/<chapter>/<section>. */
export function handbookRoute(hash: string): Route {
    const m = /^#\/handbook(?:\/([\w-]+))?(?:\/([\w-]+))?/.exec(hash);
    return { chapter: m?.[1], section: m?.[2] };
}

const heading = (c: Chapter): string => (/^\d/.test(c.number) ? `${c.number}. ${c.title}` : c.title);

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

    if (!chapter) {
        return (
            <div class="handbook">
                <h2>Handbook</h2>
                <p>{book.subtitle}</p>
                <p class="hint">Every time in this handbook is an estimate. Judge each stage by the dough, the starter and the thermometer, not the clock.</p>
                {book.parts.map((part) => {
                    const chapters = book.chapters.filter((c) => c.part === part.id);
                    return chapters.length === 0 ? null : (
                        <section class="hb-part">
                            <h3>{part.title}</h3>
                            <p class="hint">{part.intro}</p>
                            <ul class="hb-toc">
                                {chapters.map((c) => <li><a href={`#/handbook/${c.id}`}>{heading(c)}</a></li>)}
                            </ul>
                        </section>
                    );
                })}
            </div>
        );
    }

    const prev = book.chapters[index - 1];
    const next = book.chapters[index + 1];
    return (
        <div class="handbook">
            <p class="hb-back"><a href="#/handbook">All of the handbook</a></p>
            <h2>{heading(chapter)}</h2>
            {chapter.introHtml && <div class="hb-body" dangerouslySetInnerHTML={{ __html: chapter.introHtml }} />}
            {chapter.sections.map((s) => (
                <section class="hb-section" id={`${chapter.id}-${s.id}`}>
                    <h3>{s.number ? `${s.number} ` : ''}{s.title}</h3>
                    <div class="hb-body" dangerouslySetInnerHTML={{ __html: s.html }} />
                </section>
            ))}
            <nav class="hb-pager" aria-label="Chapters">
                {prev ? <a href={`#/handbook/${prev.id}`}>Previous: {prev.title}</a> : <span />}
                {next ? <a href={`#/handbook/${next.id}`}>Next: {next.title}</a> : <span />}
            </nav>
        </div>
    );
}
