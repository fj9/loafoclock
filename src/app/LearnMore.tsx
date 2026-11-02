import { useEffect, useState } from 'preact/hooks';
import type { StepId } from '../domain/plan';
import type { Chapter, Section } from '../handbook';

type Help = Array<{ chapter: Chapter; section: Section }>;

const linkTo = (c: Chapter, s: Section): string => `#/handbook/${c.id}/${s.id}`;

/**
 * "Learn more" under a step: what the handbook says about it, closed until asked for.
 * The handbook is fetched the first time one is opened, so the step cards stay light.
 */
export function LearnMore({ step }: { step: StepId }) {
    const [open, setOpen] = useState(false);
    const [help, setHelp] = useState<Help | null>(null);
    useEffect(() => {
        if (open && !help) void import('../handbook').then((m) => setHelp(m.helpForStep(step)));
    }, [open, help, step]);

    const first = help?.[0];
    return (
        <div class="learn-more">
            <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
                <span>Learn more</span>
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" class={open ? 'lm-open' : ''}><path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" /></svg>
            </button>
            {open && (
                <div class="lm-body">
                    {!help && <p class="hint">Loading…</p>}
                    {first && (
                        <>
                            <h4>{first.section.title}</h4>
                            <div class="hb-body" dangerouslySetInnerHTML={{ __html: first.section.html }} />
                            <p><a href={linkTo(first.chapter, first.section)}>Read the full section</a></p>
                            {help.length > 1 && (
                                <p class="lm-more">
                                    Also in the handbook:{' '}
                                    {help.slice(1).map((h) => <a href={linkTo(h.chapter, h.section)}>{h.section.title}</a>)}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
