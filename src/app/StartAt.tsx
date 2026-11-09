import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
    addLocalDays, atLocalTime, earlierFeedNudge, nextAwake, planForward, startOfLocalDay,
    type FeedNudge, type ForwardCategory, type ForwardMissing, type ForwardOption, type Levers as LeverSet, type Zone
} from '../domain/plan';
import { CarvePicker } from './CarvePicker';
import { CarveStrip } from './CarveStrip';
import { EmptyState } from './EmptyState';
import { PlanView, type Layout } from './PlanView';
import { clockOf, dayInSentence, dayLabel, dayTime, lengthOf } from './format';

const TITLES: Record<ForwardCategory, string> = {
    fastest: 'Fastest',
    balanced: 'Overnight in the fridge',
    moreFlavour: 'Long cold stay',
    noFridge: 'No fridge'
};

const TAGS: Partial<Record<ForwardCategory, string>> = { balanced: 'balanced', moreFlavour: 'more flavour' };

const WHY_NOT: Record<ForwardMissing['category'], Partial<Record<ForwardMissing['why'], string>>> = {
    balanced: { noFit: 'An overnight bake is not offered: a step would land in your sleeping hours.' },
    moreFlavour: { noLongerFridge: 'A long cold stay is not offered: a fridge stay 12 hours or more longer than the overnight one would put a step in your sleeping hours.' }
};

/** Quick times for the feed. */
export const FEED_TIMES = [
    { label: 'Morning', min: 7 * 60 + 30 },
    { label: 'Lunchtime', min: 12 * 60 + 30 },
    { label: 'After work', min: 17 * 60 + 30 },
    { label: 'Evening', min: 19 * 60 + 30 },
    { label: 'Before bed', min: 22 * 60 }
] as const;

interface Props {
    now: number;
    zone?: Zone;
    onStart?: (levers: LeverSet) => void;
    quickStreak?: number;
    layout?: Layout;
}

/** The first feed to offer: this evening, or tomorrow morning if that is gone. */
function firstFeed(now: number, zone?: Zone): number {
    const evening = atLocalTime(startOfLocalDay(now, zone), 19 * 60 + 30, zone);
    return evening > now ? evening : atLocalTime(addLocalDays(startOfLocalDay(now, zone), 1, zone), 7 * 60 + 30, zone);
}

function blurb(o: ForwardOption, now: number, zone: Zone): string {
    const p = o.plan;
    const mix = `Mix ${dayInSentence(p.byId.starterIn, now, zone)} at ${clockOf(p.byId.starterIn, zone)}`;
    const bake = `bake ${dayInSentence(p.byId.bake, now, zone)} at ${clockOf(p.byId.bake, zone)}`;
    return o.category === 'noFridge' ? `${mix}, bake ${clockOf(p.byId.bake, zone)}. Skips the fridge, so less sourdough.` : `${mix}, ${bake}.`;
}

/** "Start at…": pick when you will feed, get the ways the bake could go and when each is ready. */
export function StartAt({ now, zone, onStart, quickStreak, layout }: Props) {
    const [feedAt, setFeedAt] = useState(() => firstFeed(now, zone));
    const [chosen, setChosen] = useState<number | null>(null);
    const [edited, setEdited] = useState<LeverSet | null>(null);

    const past = feedAt < now - 15 * 60_000;
    const { options, missing, asleep } = useMemo(
        () => (past ? { options: [], missing: [], asleep: false } : planForward({ feedAt, zone })),
        [feedAt, past, zone]
    );
    const picked = chosen === null ? null : options[chosen] ?? null;

    // A better feed time takes a moment to find, so it comes after the options are on screen.
    const [nudge, setNudge] = useState<FeedNudge | null>(null);
    useEffect(() => {
        setNudge(null);
        if (past || asleep || options.length === 0) return;
        const id = setTimeout(() => setNudge(earlierFeedNudge({ feedAt, zone, notBefore: now })), 0);
        return () => clearTimeout(id);
    }, [feedAt, past, asleep, options.length, now, zone]);

    const yourPlan = useRef<HTMLElement>(null);
    useEffect(() => {
        if (chosen !== null) yourPlan.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, [chosen]);

    const pick = (o: ForwardOption) => { setChosen(options.indexOf(o)); setEdited(o.plan.levers); };
    const change = (t: number) => { setFeedAt(t); setChosen(null); setEdited(null); };

    const main = options.filter((o) => o.category !== 'noFridge');
    const noFridge = options.find((o) => o.category === 'noFridge');
    // The cards are numbered as listed, with no fridge last since it sits below them.
    const numbered = noFridge ? [...main, noFridge] : main;

    return (
        <div class="start-at">
            <CarvePicker value={feedAt} now={now} zone={zone} onChange={change} label="When will you feed your starter?" quick={FEED_TIMES} quickLabel="Time of day" />

            {past && (
                <EmptyState role="status" title="That time has passed">
                    Pick a time from now on.
                    {' '}<button type="button" class="link" onClick={() => change(nextAwake(now, zone))}>Use the next time you are awake</button>
                </EmptyState>
            )}
            {asleep && (
                <EmptyState role="status" title="That is in your sleeping hours">
                    Feeding then would mean getting up in the night.
                    {' '}<button type="button" class="link" onClick={() => change(nextAwake(feedAt, zone))}>Feed at {clockOf(nextAwake(feedAt, zone), zone)} instead</button>
                </EmptyState>
            )}
            {!past && !asleep && options.length === 0 && (
                <EmptyState role="status" title="No plan fits from that feed">
                    Every way of baking from this feed would put a step in your sleeping hours. Try a different time or day.
                </EmptyState>
            )}

            {options.length > 0 && (
                <>
                    <h2 class="start-at-head">Feed {dayInSentence(feedAt, now, zone)} at {clockOf(feedAt, zone)}, and you could have bread…</h2>
                    <CarveStrip feedAt={feedAt} now={now} zone={zone} marks={numbered.map((o, i) => ({ at: o.plan.readyToCarve, n: i + 1, on: o === picked }))} />
                    <div class="cards">
                        {main.map((o) => {
                            const n = numbered.indexOf(o) + 1;
                            return (
                                <button type="button" class={`plan-card opt${picked === o ? ' on' : ''}`} aria-pressed={picked === o} onClick={() => pick(o)}>
                                    <span class="opt-when">
                                        <span class="eyebrow">Carve</span>
                                        <span class="opt-time">{clockOf(o.plan.readyToCarve, zone)}</span>
                                        <span class="opt-day">{dayLabel(o.plan.readyToCarve, now, zone)}</span>
                                    </span>
                                    <span class="card-title"><span class="opt-n">{n}</span>{TITLES[o.category]}{TAGS[o.category] && <span class="opt-tag">{TAGS[o.category]}</span>}</span>
                                    <span class="card-line">1:{o.plan.levers.ratioN}:{o.plan.levers.ratioN} · {o.plan.levers.doughTemp}°C · fridge {lengthOf(o.plan.fridgeHours * 3_600_000)}</span>
                                    <span class="card-blurb">{blurb(o, now, zone)}</span>
                                    {o.quickFeed && <span class="card-warn">Needs a quick feed</span>}
                                </button>
                            );
                        })}
                    </div>
                    {noFridge && (
                        <p class="hint">
                            No fridge also fits: carve {dayTime(noFridge.plan.readyToCarve, now, zone)} (number {numbered.length}), but less sourdough.{' '}
                            <button type="button" class="link" onClick={() => pick(noFridge)}>Show that plan</button>
                        </p>
                    )}
                    {missing.length > 0 && (
                        <ul class="hint missing" aria-label="Plans not offered">
                            {missing.map((m) => <li>{WHY_NOT[m.category][m.why]}</li>)}
                        </ul>
                    )}
                    {nudge && (
                        <p class="hint nudge">
                            Want bread sooner? Feeding at {clockOf(nudge.feedAt, zone)} gets the fastest loaf by {dayTime(nudge.readyToCarve, now, zone)}.{' '}
                            <button type="button" class="link" onClick={() => change(nudge.feedAt)}>Try {clockOf(nudge.feedAt, zone)}</button>
                        </p>
                    )}
                </>
            )}

            {picked && edited && (
                <section ref={yourPlan} class="your-plan" aria-label="Your plan">
                    <h2>{TITLES[picked.category]}</h2>
                    <PlanView layout={layout} levers={edited} onChange={setEdited} now={now} zone={zone} onStart={onStart} quickStreak={quickStreak} />
                </section>
            )}
        </div>
    );
}
