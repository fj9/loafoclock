import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { buildPlan, violations, type Levers as LeverSet, type Plan, type Violation, type Zone } from '../domain/plan';
import { planToIcs } from '../domain/ics';
import { downloadText } from './download';
import { Levers } from './Levers';
import { Timeline } from './Timeline';
import { clockOf, dayTime } from './format';

interface Props {
    levers: LeverSet;
    onChange: (next: LeverSet) => void;
    now: number;
    zone?: Zone;
    /** The time you asked to carve, if you picked one. Rest before carving is counted up to it. */
    carveAt?: number;
    /** Lock the plan and go to the live view. */
    onStart?: (levers: LeverSet) => void;
    quickStreak?: number;
    /** The starter was fed before you opened the app: the feed is done and cannot change. */
    fed?: { minDelayMin: number };
    /** Shown under the timeline and the levers: the answer the levers lead to. */
    summary?: ComponentChildren;
}

function describe(v: Violation, plan: Plan, zone: Zone): string {
    if (v.kind === 'asleep') {
        const step = plan.steps.find((s) => s.id === v.stepId)!;
        return `${step.label} falls at ${clockOf(v.at, zone)}, in your sleeping hours.`;
    }
    if (v.kind === 'fridgeRange') return 'The fridge time has to be between 8 and 72 hours.';
    return 'The loaf would rest more than 16 hours before carving.';
}

/** The timeline, the levers and the step list for one plan. */
export function PlanDetail({ levers, onChange, now, zone, carveAt, onStart, quickStreak, fed, summary }: Props) {
    const plan = useMemo(() => buildPlan(levers), [levers]);
    // A feed that has already happened is not held to waking hours.
    const problems = violations(plan, { zone, carveAt }).filter((v) => !(fed && v.kind === 'asleep' && v.stepId === 'feed'));
    return (
        <>
            <Levers part="timing" levers={levers} zone={zone} onChange={onChange} quickStreak={quickStreak}
                locked={fed ? { feedRatio: true } : undefined} minDelayMin={fed?.minDelayMin} />
            {problems.length > 0 && (
                <ul class="problems" aria-label="Problems">
                    {problems.map((v) => <li>{describe(v, plan, zone)}</li>)}
                </ul>
            )}
            <Timeline plan={plan} zone={zone} now={now} />
            <Levers part="cooling" levers={levers} zone={zone} onChange={onChange} />
            {summary}
            <Levers part="loaf" levers={levers} zone={zone} onChange={onChange} />
            <section class="panel steps">
                <h2>Planned steps</h2>
                <ol>
                    {plan.steps.map((s) => (
                        <li class={problems.some((v) => v.kind === 'asleep' && v.stepId === s.id) ? 'asleep' : ''}>
                            <span class="when">{dayTime(s.at, now, zone)}</span> {s.label}
                        </li>
                    ))}
                </ol>
            </section>
            {onStart && (
                <>
                    <button type="button" class="btn big-btn" onClick={() => onStart(levers)}>Start this plan</button>
                    <div class="reminders">
                        <button type="button" class="btn outline" onClick={() => downloadText('loaf-oclock-plan.ics', planToIcs(plan, { now: Date.now(), after: Date.now() }), 'text/calendar')}>
                            Add reminders to my calendar
                        </button>
                        <p class="hint">A calendar file with an alert 10 minutes before each step. It shows the plan as it stands now, so save it again if you change the plan.</p>
                    </div>
                </>
            )}
        </>
    );
}
