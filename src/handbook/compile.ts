// Turns the handbook's markdown files into chapters, sections and HTML.
// The same code feeds the Handbook pages, the help shown inside the steps and the PDF.
import { marked } from 'marked';
import { STEP_ORDER, type StepId } from '../domain/plan';

/** A fact is a ready-made piece of markdown (a table, a number) or a function of one argument. */
export type Fact = string | ((arg: string) => string);
export type Facts = Record<string, Fact>;

export interface Section {
    id: string;
    /** "3.3", "C6" or "" when the chapter does not number its sections. */
    number: string;
    title: string;
    /** The planner steps this section helps with. */
    steps: StepId[];
    html: string;
}

export interface Chapter {
    id: string;
    /** "12", "A1", "C" or "D". */
    number: string;
    title: string;
    part: string;
    /** "ai" chapters are written for an AI assistant and only go in the PDF made for one. */
    audience: 'all' | 'ai';
    introHtml: string;
    sections: Section[];
}

export interface Part {
    id: string;
    title: string;
    intro: string;
}

export interface Handbook {
    title: string;
    subtitle: string;
    parts: Part[];
    chapters: Chapter[];
}

export interface CompileOptions {
    facts: Facts;
    /** Where a link to a chapter, or to a section in it, goes. */
    href: (chapterId: string, sectionId?: string) => string;
    /** The app shows no chapter numbers, so a link that would read "section 7" reads as the name of what it points to. */
    plainLinks?: boolean;
}

interface RawSection { id: string; title: string; steps: StepId[]; markdown: string }
interface RawChapter {
    id: string; number: string; title: string; part: string; audience: 'all' | 'ai';
    sectionNumbers: 'dotted' | 'joined' | 'none'; intro: string; sections: RawSection[];
}

const slugOf = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function frontMatter(path: string, text: string): { data: Record<string, string>; body: string } {
    const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
    if (!m) throw new Error(`${path}: no front matter`);
    const data: Record<string, string> = {};
    for (const line of m[1]!.split('\n')) {
        const kv = /^(\w+):\s*(.*)$/.exec(line);
        if (kv) data[kv[1]!] = kv[2]!.trim();
    }
    return { data, body: text.slice(m[0].length) };
}

/** "Title {#id steps=fold1,fold2}": the part in braces is optional. */
function headingOf(path: string, raw: string): { title: string; id: string; steps: StepId[] } {
    const m = /^(.*?)\s*\{([^}]*)\}\s*$/.exec(raw);
    const title = (m ? m[1]! : raw).trim();
    let id = slugOf(title);
    let steps: StepId[] = [];
    for (const token of (m ? m[2]! : '').split(/\s+/).filter(Boolean)) {
        if (token.startsWith('#')) id = token.slice(1);
        else if (token.startsWith('steps=')) {
            steps = token.slice(6).split(',').filter(Boolean).map((s) => {
                if (!(STEP_ORDER as readonly string[]).includes(s)) throw new Error(`${path}: "${title}" names an unknown step "${s}"`);
                return s as StepId;
            });
        } else throw new Error(`${path}: "${title}" has an unknown heading option "${token}"`);
    }
    return { title, id, steps };
}

function parseChapter(path: string, text: string): RawChapter {
    const { data, body } = frontMatter(path, text);
    for (const key of ['id', 'number', 'title', 'part']) if (!data[key]) throw new Error(`${path}: front matter needs "${key}"`);
    const numbering = data.sectionNumbers ?? 'none';
    if (numbering !== 'dotted' && numbering !== 'joined' && numbering !== 'none') throw new Error(`${path}: sectionNumbers must be dotted, joined or none`);
    const chapter: RawChapter = {
        id: data.id!, number: data.number!, title: data.title!, part: data.part!,
        audience: data.audience === 'ai' ? 'ai' : 'all', sectionNumbers: numbering, intro: '', sections: []
    };
    let current: RawSection | null = null;
    const introLines: string[] = [];
    const lines: Record<string, string[]> = {};
    for (const line of body.split('\n')) {
        if (line.startsWith('## ')) {
            const h = headingOf(path, line.slice(3));
            if (lines[h.id]) throw new Error(`${path}: two sections are called "${h.id}"`);
            current = { id: h.id, title: h.title, steps: h.steps, markdown: '' };
            lines[h.id] = [];
            chapter.sections.push(current);
        } else (current ? lines[current.id]! : introLines).push(line);
    }
    chapter.intro = introLines.join('\n').trim();
    for (const s of chapter.sections) s.markdown = lines[s.id]!.join('\n').trim();
    return chapter;
}

export function compileHandbook(files: Record<string, string>, options: CompileOptions): Handbook {
    const metaEntry = Object.entries(files).find(([p]) => p.endsWith('handbook.json'));
    if (!metaEntry) throw new Error('handbook.json is missing');
    const meta = JSON.parse(metaEntry[1]) as { title: string; subtitle: string; parts: Part[] };

    const raws = Object.entries(files)
        .filter(([p]) => p.endsWith('.md'))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([p, text]) => parseChapter(p, text));

    const byId = new Map<string, RawChapter>();
    for (const c of raws) {
        if (byId.has(c.id)) throw new Error(`two chapters are called "${c.id}"`);
        if (!meta.parts.some((p) => p.id === c.part)) throw new Error(`chapter "${c.id}" is in an unknown part "${c.part}"`);
        byId.set(c.id, c);
    }

    const numberOf = (c: RawChapter, i: number): string =>
        c.sectionNumbers === 'dotted' ? `${c.number}.${i + 1}` : c.sectionNumbers === 'joined' ? `${c.number}${i + 1}` : '';

    const resolveFacts = (where: string, md: string): string =>
        md.replace(/\{\{\s*([\w.]+)(?:\s+([^}]*?))?\s*\}\}/g, (_all, name: string, arg?: string) => {
            const fact = options.facts[name];
            if (fact === undefined) throw new Error(`${where}: unknown fact {{${name}}}`);
            if (typeof fact === 'function') {
                if (arg === undefined) throw new Error(`${where}: {{${name}}} needs a value`);
                return fact(arg.trim());
            }
            return fact;
        });

    /** [[chapter]], [[chapter#section]] and [[chapter#section|your own words]]. */
    const resolveLinks = (where: string, md: string): string =>
        md.replace(/\[\[([\w-]+)(?:#([\w-]+))?(?:\|([^\]]+))?\]\]/g, (_all, cid: string, sid?: string, label?: string) => {
            const chapter = byId.get(cid);
            if (!chapter) throw new Error(`${where}: [[${cid}]] is not a chapter`);
            let text: string;
            if (sid) {
                const index = chapter.sections.findIndex((s) => s.id === sid);
                if (index < 0) throw new Error(`${where}: [[${cid}#${sid}]] is not a section`);
                text = `section ${numberOf(chapter, index) || chapter.number}`;
            } else {
                text = /^[AC]?\d/.test(chapter.number) ? `section ${chapter.number}` : `Part ${chapter.number}`;
            }
            if (options.plainLinks && (!label || /^(?:sections?\s+)?[A-E]?\d+(?:\.\d+)?\b/i.test(label))) {
                const target = sid ? chapter.sections.find((s) => s.id === sid)! : chapter;
                return `[${target.title}](${options.href(cid, sid)})`;
            }
            return `[${label ?? text}](${options.href(cid, sid)})`;
        });

    const render = (where: string, md: string): string =>
        marked.parse(resolveLinks(where, resolveFacts(where, md)), { async: false, gfm: true });

    const chapters: Chapter[] = raws.map((c) => ({
        id: c.id, number: c.number, title: c.title, part: c.part, audience: c.audience,
        introHtml: render(`${c.id} (intro)`, c.intro),
        sections: c.sections.map((s, i) => ({
            id: s.id, number: numberOf(c, i), title: s.title, steps: s.steps, html: render(`${c.id}#${s.id}`, s.markdown)
        }))
    }));
    return { title: meta.title, subtitle: meta.subtitle, parts: meta.parts, chapters };
}

/** The sections that help with a planner step. */
export function sectionsForStep(book: Handbook, step: StepId): Array<{ chapter: Chapter; section: Section }> {
    return book.chapters.flatMap((chapter) => chapter.sections.filter((s) => s.steps.includes(step)).map((section) => ({ chapter, section })));
}
