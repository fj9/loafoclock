import { type StepId } from '../domain/plan';
import { exampleFor, dayName } from '../handbook/example';
import { lengthOf } from './format';
import { RailTimeline } from './RailTimeline';
import { Timeline } from './Timeline';

type ExamplePlan = ReturnType<typeof exampleFor>;

/**
 * What a figure shows, from the text in {{planFigure ...}} and {{planBar ...}}: "bar:<spec>" is the bar only, and "<spec>|<spec>" is
 * the first bake with the baking of a second loaf added to the end of its steps.
 */
export function parseFigure(spec: string): { bar: boolean; specs: string[] } {
    return spec.startsWith('bar:') ? { bar: true, specs: [spec.slice(4)] } : { bar: false, specs: spec.split('|') };
}

/** What was chosen, as label and value pairs. */
function choices(plan: ExamplePlan): Array<[string, string]> {
    const l = plan.levers;
    const wait = lengthOf(plan.byId.starterIn - plan.byId.feed);
    const fridge = l.fridge.kind === 'none' ? 'None, proofed on the counter' : lengthOf(plan.fridgeHours * 3_600_000);
    return [
        ...(l.loaves === 2 ? [['Loaves', 'Two'] as [string, string]] : []),
        ['Feed', `1:${l.ratioN}:${l.ratioN}`], ['Starter in', `${wait} after feeding`],
        ...(l.autolyseMin === 0 ? [['Autolyse', 'Skipped'] as [string, string]] : []),
        ['Dough', `${l.doughTemp}°C`],
        ['Fridge', fridge], ['Cooling', `${l.cooling} minutes`]
    ];
}

/** What was chosen, in words: "1:2:2 feed, starter added 5 h after feeding, dough 24°C, 10 h in the fridge". */
function settings(plan: ExamplePlan): string {
    const l = plan.levers;
    const wait = lengthOf(plan.byId.starterIn - plan.byId.feed);
    const fridge = l.fridge.kind === 'none' ? 'no fridge, proofed on the counter' : `${lengthOf(plan.fridgeHours * 3_600_000)} in the fridge`;
    return `${l.loaves === 2 ? 'Two loaves, ' : ''}1:${l.ratioN}:${l.ratioN} feed, starter added ${wait} after feeding, ${l.autolyseMin === 0 ? 'no autolyse, ' : ''}dough ${l.doughTemp}°C, ${fridge}, ${l.cooling} minutes cooling.`;
}

/** The whole bake on one bar. When it is ready to carve is said in the text beside it. */
export function PlanFigureTop({ plan, width }: { plan: ExamplePlan; width?: number }) {
    return <Timeline plan={plan} dayLabel={dayName} width={width} />;
}

/** The steps, down a rail. */
export const PlanFigureRail = ({ plan, from }: { plan: ExamplePlan; from?: StepId }) => <RailTimeline plan={plan} dayLabel={dayName} from={from} />;

/** The second loaf's baking, as the end of the same list of steps. */
export const SECOND_LOAF_FROM: StepId = 'ovenOn';

/** What was chosen, in words (for the printed handbook). */
export const PlanFigureCaption = ({ plan }: { plan: ExamplePlan }) => <figcaption class="hint">{settings(plan)}</figcaption>;

/** The choices a worked example is built on, as cards. They sit at the top of the example, before the detail. */
export function PlanSettings({ spec }: { spec: string }) {
    return (
        <dl class="hb-settings" aria-label="The choices this example is built on">
            {choices(exampleFor(spec)).map(([label, value]) => <div><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
    );
}

/**
 * A worked example as the app shows a plan: the whole bake on one bar, and the steps down a rail.
 * It has the planner's look without its levers or its ready-to-carve box, and days are called Day 1, Day 2 instead of by date.
 */
export function PlanFigure({ spec, width }: { spec: string; width?: number }) {
    const { bar, specs } = parseFigure(spec);
    const plan = exampleFor(specs[0]!);
    const second = specs[1] ? exampleFor(specs[1]) : null;
    return (
        <figure class="hb-plan">
            <PlanFigureTop plan={plan} width={width} />
            {!bar && <PlanFigureRail plan={plan} />}
            {!bar && second && (
                <>
                    <p class="hb-second">The second loaf stays in the fridge and is baked a day later:</p>
                    <PlanFigureRail plan={second} from={SECOND_LOAF_FROM} />
                </>
            )}
        </figure>
    );
}
