import { useMemo, useState } from 'preact/hooks';
import {
    buildPlan, carveRange, leversAt, startNowLevers, totalHours, violations, HOUR, type Levers as LeverSet, type Plan,
    type Violation, type Zone
} from '../domain/plan';
import { Levers } from './Levers';
import { Timeline } from './Timeline';
import { clockOf, dayLabel, lengthOf, whenOf } from './format';

interface Props {
    now: number;
    zone?: Zone;
}

function describe(v: Violation, plan: Plan, zone: Zone): string {
    if (v.kind === 'asleep') {
        const step = plan.steps.find((s) => s.id === v.stepId)!;
        return `${step.label} falls at ${clockOf(v.at, zone)}, in your sleeping hours.`;
    }
    if (v.kind === 'fridgeRange') return 'The fridge time has to be between 8 and 72 hours.';
    return 'The loaf would rest more than 16 hours before carving.';
}

/** "Start a loaf now": see the range, then pull the levers. */
export function StartNow({ now, zone }: Props) {
    const [levers, setLevers] = useState<LeverSet>(() => startNowLevers(now, {}, zone) ?? leversAt(now));
    const plan = useMemo(() => buildPlan(levers), [levers]);
    const range = useMemo(() => carveRange(now, { cooling: levers.cooling, size: levers.size }), [now, levers.cooling, levers.size]);
    const problems = violations(plan, { zone });

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

            {problems.length > 0 && (
                <ul class="problems" aria-label="Problems">
                    {problems.map((v) => <li>{describe(v, plan, zone)}</li>)}
                </ul>
            )}

            <Timeline plan={plan} zone={zone} now={now} />
            <Levers levers={levers} zone={zone} onChange={setLevers} />
            <button type="button" class="btn outline" onClick={() => setLevers(startNowLevers(now, {}, zone) ?? leversAt(now))}>
                Suggest levers again
            </button>

            <section class="panel steps">
                <h2>The steps</h2>
                <ol>
                    {plan.steps.map((s) => (
                        <li class={s.needsYou && problems.some((v) => v.kind === 'asleep' && v.stepId === s.id) ? 'asleep' : ''}>
                            <span class="when">{dayLabel(s.at, now, zone)}, {clockOf(s.at, zone)}</span> {s.label}
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    );
}
