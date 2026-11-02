import type { StepId } from '../domain/plan';
import { compileHandbook, sectionsForStep, type Chapter, type Handbook, type Section } from './compile';
import { FACTS } from './facts';
import { HANDBOOK_FILES } from './files';

/** Handbook links are hash links, so they work from a bookmark and with the back button. */
export const handbookHref = (chapterId: string, sectionId?: string): string => `#/handbook/${chapterId}${sectionId ? `/${sectionId}` : ''}`;

let loaded: Handbook | undefined;

/** The handbook as the app shows it: chapters for the reader, without the briefing written for an AI assistant. Worked out once. */
export function loadHandbook(): Handbook {
    if (!loaded) {
        const book = compileHandbook(HANDBOOK_FILES, { facts: FACTS, href: handbookHref });
        loaded = { ...book, chapters: book.chapters.filter((c) => c.audience === 'all') };
    }
    return loaded;
}

/** What the handbook says about a planner step. The step-by-step chapter comes first, then the rest in handbook order. */
export function helpForStep(step: StepId): Array<{ chapter: Chapter; section: Section }> {
    const found = sectionsForStep(loadHandbook(), step);
    return [...found.filter((f) => f.chapter.id === 'process'), ...found.filter((f) => f.chapter.id !== 'process')];
}

export type { Chapter, Handbook, Section } from './compile';
