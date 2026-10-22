import { useMemo, useState } from 'preact/hooks';
import { planBackward, atLocalTime, addLocalDays, startOfLocalDay, type Candidate, type Category, type Levers as LeverSet, type Zone } from '../domain/plan';
import { CarvePicker } from './CarvePicker';
import { PlanDetail } from './PlanDetail';
import { clockOf, dayInSentence, lengthOf } from './format';

const TITLES: Record<Category, string> = {
    fresh: 'Baked fresh',
    moreFlavour: 'More flavour',
    bedtime: 'Bake at bedtime',
    noFridge: 'No fridge'
};

interface Props {
    now: number;
    zone?: Zone;
    onStart?: (levers: LeverSet) => void;
    quickStreak?: number;
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

/** "I want bread at...": pick when, get plans that work backwards from it. */
export function BreadAt({ now, zone, onStart, quickStreak }: Props) {
    // Start on tomorrow's lunch... or, if that is too soon to make, the day after.
    const [carveAt, setCarveAt] = useState(() => atLocalTime(addLocalDays(startOfLocalDay(now, zone), 2, zone), 12 * 60 + 30, zone));
    const [chosen, setChosen] = useState<number | null>(null);
    const [edited, setEdited] = useState<LeverSet | null>(null);

    const candidates = useMemo(() => planBackward({ carveAt, zone, notBefore: now, allowNoFridge: true }), [carveAt, now, zone]);
    const main = candidates.filter((c) => c.category !== 'noFridge');
    const noFridge = candidates.find((c) => c.category === 'noFridge');
    const picked = chosen === null ? null : candidates[chosen] ?? null;

    const pick = (c: Candidate) => { setChosen(candidates.indexOf(c)); setEdited(c.plan.levers); };
    const change = (t: number) => { setCarveAt(t); setChosen(null); setEdited(null); };

    return (
        <div class="bread-at">
            <CarvePicker value={carveAt} now={now} zone={zone} onChange={change} />

            {candidates.length === 0 && (
                <p class="problems" role="status">
                    There is no way to fit a loaf in before then while keeping every step in your waking hours. Try a later time or day.
                </p>
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
            {noFridge && (
                <p class="hint">
                    No fridge also fits.{' '}
                    <button type="button" class="link" onClick={() => pick(noFridge)}>Show that plan</button>
                </p>
            )}

            {picked && edited && (
                <section aria-label="Your plan">
                    <h2>{TITLES[picked.category]}</h2>
                    <PlanDetail levers={edited} onChange={setEdited} now={now} zone={zone} carveAt={carveAt} onStart={onStart} quickStreak={quickStreak} />
                </section>
            )}
        </div>
    );
}
