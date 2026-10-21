import { useMemo, useState } from 'preact/hooks';
import { buildPlan, carveRange, leversAt, startNowLevers, totalHours, HOUR, type Levers as LeverSet, type Zone } from '../domain/plan';
import { PlanDetail } from './PlanDetail';
import { clockOf, dayLabel, lengthOf, whenOf } from './format';

interface Props {
    now: number;
    zone?: Zone;
    onStart?: (levers: LeverSet) => void;
    quickStreak?: number;
    /** Loaf choices to start from, for repeating a bake. */
    base?: Partial<Pick<LeverSet, 'loaves' | 'size' | 'hydration' | 'doughTemp'>>;
}

/** "Start a loaf now": see the range, then pull the levers. */
export function StartNow({ now, zone, onStart, quickStreak, base = {} }: Props) {
    const [levers, setLevers] = useState<LeverSet>(() => startNowLevers(now, base, zone) ?? leversAt(now, base));
    const plan = useMemo(() => buildPlan(levers), [levers]);
    const range = useMemo(() => carveRange(now, { cooling: levers.cooling, size: levers.size }), [now, levers.cooling, levers.size]);

    return (
        <div class="start-now">
            <section class="panel result" aria-live="polite">
                <p class="eyebrow">Ready to carve</p>
                <p class="big">{dayLabel(plan.readyToCarve, now, zone)} at {clockOf(plan.readyToCarve, zone)}</p>
                <p class="hint">{lengthOf(plan.readyToCarve - plan.byId.feed)} from the first feed.</p>
                <p class="hint range">
                    Fastest {whenOf(range.fastest.readyToCarve, zone)} ({lengthOf(totalHours(range.fastest) * HOUR)}).
                    {' '}With no fridge, {whenOf(range.noFridge.readyToCarve, zone)}, but less sourdough.
                </p>
            </section>
            <PlanDetail levers={levers} onChange={setLevers} now={now} zone={zone} onStart={onStart} quickStreak={quickStreak} />
            <button type="button" class="btn outline" onClick={() => setLevers(startNowLevers(now, base, zone) ?? leversAt(now, base))}>
                Suggest levers again
            </button>
        </div>
    );
}
