import { FOLD_IDS, type StepId } from '../domain/plan';
import { STEP_COUNT, numberedStepFor } from '../domain/steps';

/** "Step 5 of 10" for a planner step, with "fold 2 of 4" after it for the folds. The text, for titles and labels. */
export function stepNoText(id: StepId): string {
    const n = FOLD_IDS.indexOf(id);
    return `Step ${numberedStepFor(id).number} of ${STEP_COUNT}${n >= 0 ? `, fold ${n + 1} of ${FOLD_IDS.length}` : ''}`;
}

/** A small "Step N of 10" tag. */
export function StepNo({ id }: { id: StepId }) {
    return <span class="step-no">{stepNoText(id)}</span>;
}
