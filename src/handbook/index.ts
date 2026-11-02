import { compileHandbook, type Handbook } from './compile';
import { FACTS } from './facts';
import { HANDBOOK_FILES } from './files';

/** Handbook links are hash links, so they work from a bookmark and with the back button. */
export const handbookHref = (chapterId: string, sectionId?: string): string => `#/handbook/${chapterId}${sectionId ? `/${sectionId}` : ''}`;

/** The handbook as the app shows it: chapters for the reader, without the briefing written for an AI assistant. */
export function loadHandbook(): Handbook {
    const book = compileHandbook(HANDBOOK_FILES, { facts: FACTS, href: handbookHref });
    return { ...book, chapters: book.chapters.filter((c) => c.audience === 'all') };
}

export { sectionsForStep } from './compile';
export type { Chapter, Handbook, Section } from './compile';
