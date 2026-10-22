import { guideFor } from '../domain/stepGuide';
import type { Plan, StepId, Zone } from '../domain/plan';
import { TIPS } from '../domain/tips';
import { clockOf } from './format';

interface Props {
    id: StepId;
    plan: Plan;
    zone?: Zone;
}

/**
 * What the step is, the amounts and the instructions for one step. It sits inside a card or a list row.
 * Timers start themselves when you tick a step, and show above, so there is no timer here.
 */
export function StepDetail({ id, plan, zone }: Props) {
    const guide = guideFor(id, plan, (ms) => clockOf(ms, zone));
    return (
        <div class="step-detail">
            {guide.tip && <p class="about">{TIPS[guide.tip].text}</p>}
            {guide.ingredients.length > 0 && (
                <ul class="ingredients" aria-label="You will need">{guide.ingredients.map((i) => <li>{i}</li>)}</ul>
            )}
            <ol class="instructions">{guide.instructions.map((i) => <li>{i}</li>)}</ol>
            {guide.note && <p class="hint">{guide.note}</p>}
        </div>
    );
}
