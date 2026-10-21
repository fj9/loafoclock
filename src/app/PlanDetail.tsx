import { useMemo } from 'preact/hooks';
import { buildPlan, violations, type Levers as LeverSet, type Plan, type Violation, type Zone } from '../domain/plan';
import { Levers } from './Levers';
import { Timeline } from './Timeline';
import { clockOf, dayLabel } from './format';

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
export function PlanDetail({ levers, onChange, now, zone, carveAt, onStart, quickStreak }: Props) {
    const plan = useMemo(() => buildPlan(levers), [levers]);
    const problems = violations(plan, { zone, carveAt });
    return (
        <>
            {problems.length > 0 && (
                <ul class="problems" aria-label="Problems">
                    {problems.map((v) => <li>{describe(v, plan, zone)}</li>)}
                </ul>
            )}
            <Timeline plan={plan} zone={zone} now={now} />
            <Levers levers={levers} zone={zone} onChange={onChange} quickStreak={quickStreak} />
            <section class="panel steps">
                <h2>The steps</h2>
                <ol>
                    {plan.steps.map((s) => (
                        <li class={problems.some((v) => v.kind === 'asleep' && v.stepId === s.id) ? 'asleep' : ''}>
                            <span class="when">{dayLabel(s.at, now, zone)}, {clockOf(s.at, zone)}</span> {s.label}
                        </li>
                    ))}
                </ol>
            </section>
            {onStart && (
                <button type="button" class="btn big-btn" onClick={() => onStart(levers)}>Start this plan</button>
            )}
        </>
    );
}
