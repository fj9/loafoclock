import { localDayNumber } from '../domain/plan';
import { exampleFor, dayName } from '../handbook/example';
import { lengthOf } from './format';
import { RailTimeline } from './RailTimeline';
import { Timeline } from './Timeline';

type ExamplePlan = ReturnType<typeof exampleFor>;

/** What was chosen, in words: "1:2:2 feed, starter added 5 h after feeding, dough 24°C, 10 h in the fridge". */
function settings(plan: ExamplePlan): string {
    const l = plan.levers;
    const wait = lengthOf(plan.byId.starterIn - plan.byId.feed);
    const fridge = l.fridge.kind === 'none' ? 'no fridge, proofed on the counter' : `${lengthOf(plan.fridgeHours * 3_600_000)} in the fridge`;
    return `${l.loaves === 2 ? 'Two loaves, ' : ''}1:${l.ratioN}:${l.ratioN} feed, starter added ${wait} after feeding, dough ${l.doughTemp}°C, ${fridge}, ${l.cooling} minutes cooling.`;
}

/** The whole bake on one bar. When it is ready to carve is said in the text beside it. */
export function PlanFigureTop({ plan, width }: { plan: ExamplePlan; width?: number }) {
    return <Timeline plan={plan} dayLabel={dayName} width={width} />;
}

/** The steps, down a rail. */
export const PlanFigureRail = ({ plan }: { plan: ExamplePlan }) => <RailTimeline plan={plan} dayLabel={dayName} />;

/** What was chosen, in words. */
export const PlanFigureCaption = ({ plan }: { plan: ExamplePlan }) => <figcaption class="hint">{settings(plan)}</figcaption>;

/**
 * A worked example as the app shows a plan: the whole bake on one bar, and the steps down a rail.
 * It has the planner's look without its levers or its ready-to-carve box, and days are called Day 1, Day 2 instead of by date.
 */
export function PlanFigure({ spec, width }: { spec: string; width?: number }) {
    const plan = exampleFor(spec);
    return (
        <figure class="hb-plan">
            <PlanFigureTop plan={plan} width={width} />
            <PlanFigureRail plan={plan} />
            <PlanFigureCaption plan={plan} />
        </figure>
    );
}
