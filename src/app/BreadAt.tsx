import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { planBackwardWithReasons, atLocalTime, addLocalDays, startOfLocalDay, type Candidate, type Category, type Levers as LeverSet, type Missing, type Zone } from '../domain/plan';
import { CarvePicker } from './CarvePicker';
import { EmptyState } from './EmptyState';
import { PlanView, type Layout } from './PlanView';
import { clockOf, dayInSentence, lengthOf } from './format';

const TITLES: Record<Category, string> = {
    fresh: 'Baked fresh',
    moreFlavour: 'More flavour',
    bedtime: 'Bake at bedtime',
    noFridge: 'No fridge'
};

const WHY_NOT: Record<Missing['category'], Partial<Record<Missing['why'], string>>> = {
    fresh: { noFit: 'Baked fresh is not offered: the oven or the shaping would fall in your sleeping hours.' },
    moreFlavour: {
        quickFeedsOnly: 'More flavour is not offered: only a quick feed fits this time.',
        noLongerFridge: 'More flavour is not offered: a fridge stay 12 hours or more longer would put a step in your sleeping hours.'
    },
    bedtime: {
        timeOfDay: 'A bedtime bake is not offered: it only suits carving the next morning, after the loaf has waited overnight.',
        noFit: 'A bedtime bake is not offered: it would put a step in your sleeping hours.'
    }
};

interface Props {
    now: number;
    zone?: Zone;
    onStart?: (levers: LeverSet) => void;
    quickStreak?: number;
    layout?: Layout;
}

function blurb(c: Candidate, now: number, zone: Zone): string {
    const p = c.plan;
    const out = `out of the oven ${dayInSentence(p.byId.out, now, zone)} at ${clockOf(p.byId.out, zone)}`;
    switch (c.category) {
        case 'fresh': return `Feed ${dayInSentence(p.byId.feed, now, zone)} at ${clockOf(p.byId.feed, zone)}. Carve straight after it cools.`;
        case 'moreFlavour': return `${lengthOf(p.fridgeHours * 3_600_000)} in the fridge for a tangier loaf, feed ${dayInSentence(p.byId.feed, now, zone)} at ${clockOf(p.byId.feed, zone)}.`;
        case 'bedtime': return `Loaf ${out}, carved in the morning. Feed ${dayInSentence(p.byId.feed, now, zone)} at ${clockOf(p.byId.feed, zone)}.`;
        case 'noFridge': return `Skips the fridge, so less sourdough. Feed ${dayInSentence(p.byId.feed, now, zone)} at ${clockOf(p.byId.feed, zone)}.`;
    }
}

/** "I want bread at…": pick when, get plans that work backwards from it. */
export function BreadAt({ now, zone, onStart, quickStreak, layout }: Props) {
    // Start on tomorrow's lunch... or, if that is too soon to make, the day after.
    const [carveAt, setCarveAt] = useState(() => atLocalTime(addLocalDays(startOfLocalDay(now, zone), 2, zone), 12 * 60 + 30, zone));
    const [chosen, setChosen] = useState<number | null>(null);
    const [edited, setEdited] = useState<LeverSet | null>(null);

    const { candidates, missing } = useMemo(() => planBackwardWithReasons({ carveAt, zone, notBefore: now, allowNoFridge: true }), [carveAt, now, zone]);
    const main = candidates.filter((c) => c.category !== 'noFridge');
    const noFridge = candidates.find((c) => c.category === 'noFridge');
    const picked = chosen === null ? null : candidates[chosen] ?? null;

    // Choosing a plan opens it further down the page, so go there.
    const yourPlan = useRef<HTMLElement>(null);
    useEffect(() => {
        if (chosen !== null) yourPlan.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, [chosen]);

    const pick = (c: Candidate) => { setChosen(candidates.indexOf(c)); setEdited(c.plan.levers); };
    const change = (t: number) => { setCarveAt(t); setChosen(null); setEdited(null); };

    return (
        <div class="bread-at">
            <CarvePicker value={carveAt} now={now} zone={zone} onChange={change} />

            {candidates.length === 0 && (
                <EmptyState role="status" title="No plan fits that time">
                    There is no way to fit a loaf in before then while keeping every step in your waking hours. Try a later time or day.
                </EmptyState>
            )}

            <div class="cards">
                {main.map((c) => (
                    <button type="button" class={`plan-card${picked === c ? ' on' : ''}`} aria-pressed={picked === c} onClick={() => pick(c)}>
                        <span class="card-title">{TITLES[c.category]}</span>
                        <span class="card-line">Feed {clockOf(c.plan.byId.feed, zone)} · 1:{c.plan.levers.ratioN}:{c.plan.levers.ratioN} · {c.plan.levers.doughTemp}°C · fridge {lengthOf(c.plan.fridgeHours * 3_600_000)}</span>
                        <span class="card-blurb">{blurb(c, now, zone)}</span>
                        {c.quickFeed && <span class="card-warn">Needs a quick feed</span>}
                    </button>
                ))}
            </div>
            {missing.length > 0 && (
                <ul class="hint missing" aria-label="Plans not offered">
                    {missing.map((m) => <li>{WHY_NOT[m.category][m.why]}</li>)}
                </ul>
            )}
            {noFridge && (
                <p class="hint">
                    No fridge also fits.{' '}
                    <button type="button" class="link" onClick={() => pick(noFridge)}>Show that plan</button>
                </p>
            )}

            {picked && edited && (
                <section ref={yourPlan} class="your-plan" aria-label="Your plan">
                    <h2>{TITLES[picked.category]}</h2>
                    <PlanView layout={layout} levers={edited} onChange={setEdited} now={now} zone={zone} carveAt={carveAt} onStart={onStart} quickStreak={quickStreak} />
                </section>
            )}
        </div>
    );
}
