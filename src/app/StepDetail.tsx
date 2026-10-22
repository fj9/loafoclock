import { guideFor } from '../domain/stepGuide';
import type { Plan, StepId, Zone } from '../domain/plan';
import { Tip } from './Tip';
import { clockOf } from './format';

interface Props {
    id: StepId;
    plan: Plan;
    zone?: Zone;
    /** Show the "what is this?" hint here. The Next up card has it beside its title instead. */
    showTip?: boolean;
}

/**
 * The amounts and the instructions for one step. It sits inside a card or a list row.
 * Timers start themselves when you tick a step, and show above, so there is no timer here.
 */
export function StepDetail({ id, plan, zone, showTip }: Props) {
    const guide = guideFor(id, plan, (ms) => clockOf(ms, zone));
    return (
        <div class="step-detail">
            {showTip && guide.tip && <p class="what">What is this? <Tip name={guide.tip} /></p>}
            {guide.ingredients.length > 0 && (
                <ul class="ingredients" aria-label="You will need">{guide.ingredients.map((i) => <li>{i}</li>)}</ul>
            )}
            <ol class="instructions">{guide.instructions.map((i) => <li>{i}</li>)}</ol>
            {guide.note && <p class="hint">{guide.note}</p>}
        </div>
    );
}
