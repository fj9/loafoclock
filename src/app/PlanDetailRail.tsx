import { useMemo } from 'preact/hooks';
import { buildPlan, violations } from '../domain/plan';
import { planToIcs } from '../domain/ics';
import { downloadText } from './download';
import { Levers } from './Levers';
import { describe, type PlanDetailProps } from './PlanDetail';
import { RailTimeline } from './RailTimeline';
import { Timeline } from './Timeline';
import { dayTime, lengthOf } from './format';

/**
 * The New plan layout for one plan. The answer is pinned to the top while you pull the levers, the steps
 * run down a rail, and on a wide screen the timeline goes across the top with the levers beside the rail.
 */
export function PlanDetailRail({ levers, onChange, now, zone, carveAt, onStart, quickStreak, fed, range, notice }: PlanDetailProps) {
    const plan = useMemo(() => buildPlan(levers), [levers]);
    // A feed that has already happened is not held to waking hours.
    const problems = violations(plan, { zone, carveAt }).filter((v) => !(fed && v.kind === 'asleep' && v.stepId === 'feed'));
    // The timeline marks each step in the night, so the list here only counts them.
    const asleep = problems.filter((v) => v.kind === 'asleep').length;
    const others = problems.filter((v) => v.kind !== 'asleep');
    return (
        <div class="np">
            <div class="np-bar" role="status" aria-live="polite">
                <div>
                    <span class="eyebrow">Ready to carve</span>
                    <strong class="np-when">{dayTime(plan.readyToCarve, now, zone)}</strong>
                </div>
                <span class="np-len">{lengthOf(plan.readyToCarve - plan.byId.feed)} from the first feed</span>
            </div>
            {range && <p class="hint np-range">{range}</p>}
            {notice}
            <div class="np-wide-only"><Timeline plan={plan} zone={zone} now={now} /></div>
            <div class="np-grid">
                <div class="np-left">
                    <Levers part="timing" levers={levers} zone={zone} onChange={onChange} quickStreak={quickStreak}
                        locked={fed ? { feedRatio: true } : undefined} minDelayMin={fed?.minDelayMin} />
                    {asleep > 0 && (
                        <p class="hint warn" role="status">
                            {asleep === 1 ? '1 step falls' : `${asleep} steps fall`} in your sleeping hours. {asleep === 1 ? 'It is' : 'They are'} marked on the timeline.
                        </p>
                    )}
                    {others.length > 0 && (
                        <ul class="problems" aria-label="Problems">
                            {others.map((v) => <li>{describe(v, plan, zone)}</li>)}
                        </ul>
                    )}
                    <Levers part="cooling" levers={levers} zone={zone} onChange={onChange} />
                    <Levers part="loaf" levers={levers} zone={zone} onChange={onChange} />
                </div>
                <section class="np-right" aria-label="Planned steps">
                    <h2>Planned steps</h2>
                    <RailTimeline plan={plan} zone={zone} now={now} />
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
                </section>
            </div>
        </div>
    );
}
