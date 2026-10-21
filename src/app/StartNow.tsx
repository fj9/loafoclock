import { useMemo, useState } from 'preact/hooks';
import { buildPlan, carveRange, leversAt, startNowLevers, totalHours, HOUR, type Levers as LeverSet, type Zone } from '../domain/plan';
import { PlanDetail } from './PlanDetail';
import { clockOf, dayLabel, lengthOf, whenOf } from './format';

interface Props {
    now: number;
    zone?: Zone;
}

/** "Start a loaf now": see the range, then pull the levers. */
export function StartNow({ now, zone }: Props) {
    const [levers, setLevers] = useState<LeverSet>(() => startNowLevers(now, {}, zone) ?? leversAt(now));
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
            <PlanDetail levers={levers} onChange={setLevers} now={now} zone={zone} />
            <button type="button" class="btn outline" onClick={() => setLevers(startNowLevers(now, {}, zone) ?? leversAt(now))}>
                Suggest levers again
            </button>
        </div>
    );
}
