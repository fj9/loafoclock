import { useMemo, useState } from 'preact/hooks';
import { DEFAULT_LEVERS, buildPlan, carveRange, leversAt, startNowLevers, totalHours, HOUR, type Levers as LeverSet, type Zone } from '../domain/plan';
import { PlanView, type Layout } from './PlanView';
import { dayTime, lengthOf, whenOf } from './format';

interface Props {
    now: number;
    zone?: Zone;
    onStart?: (levers: LeverSet) => void;
    quickStreak?: number;
    /** Loaf choices to start from, for repeating a bake. */
    base?: Partial<Pick<LeverSet, 'loaves' | 'size' | 'hydration' | 'doughTemp'>>;
    layout?: Layout;
}

/** "Start a loaf now": see the range, then pull the levers. */
export function StartNow({ now, zone, onStart, quickStreak, base = {}, layout }: Props) {
    const [start] = useState<LeverSet>(() => startNowLevers(now, base, zone) ?? leversAt(now, base));
    const [levers, setLevers] = useState<LeverSet>(start);
    const plan = useMemo(() => buildPlan(levers), [levers]);
    const range = useMemo(() => carveRange(now, { cooling: levers.cooling, size: levers.size }), [now, levers.cooling, levers.size]);

    const notice = (
        <>
            {start.feedAt > now && levers.feedAt === start.feedAt && (
                <p class="hint">Feeding right now would mean getting up in the night, so the first feed is {dayTime(start.feedAt, now, zone)}.</p>
            )}
            {start.doughTemp !== DEFAULT_LEVERS.doughTemp && base.doughTemp === undefined && levers.doughTemp === start.doughTemp && (
                <p class="hint">Dough temperature starts at {start.doughTemp}°C because that gets you bread soonest without waking in the night. Change it below if your kitchen is different.</p>
            )}
        </>
    );

    return (
        <div class="start-now">
            <PlanView layout={layout} notice={notice} levers={levers} onChange={setLevers} now={now} zone={zone} onStart={onStart} quickStreak={quickStreak} summary={(
                    <section class="panel result" aria-live="polite">
                        <p class="eyebrow">Ready to carve</p>
                        <p class="big">{dayTime(plan.readyToCarve, now, zone)}</p>
                        <p class="hint">{lengthOf(plan.readyToCarve - plan.byId.feed)} from the first feed.</p>
                        <p class="hint range">
                            Fastest {whenOf(range.fastest.readyToCarve, zone)} ({lengthOf(totalHours(range.fastest) * HOUR)}).
                            {' '}With no fridge, {whenOf(range.noFridge.readyToCarve, zone)}, but less sourdough.
                        </p>
                    </section>
            )} range={<>
                Fastest {whenOf(range.fastest.readyToCarve, zone)} ({lengthOf(totalHours(range.fastest) * HOUR)}).
                {' '}With no fridge, {whenOf(range.noFridge.readyToCarve, zone)}, but less sourdough.
            </>} />
        </div>
    );
}
