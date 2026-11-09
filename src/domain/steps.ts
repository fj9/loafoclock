// The ten numbered steps, read from data/steps.json so the app and the handbook share one set of numbers.
import data from '../../data/steps.json';
import type { StepId } from './plan';

export interface NumberedStep {
    key: string;
    number: number;
    name: string;
    alsoCalled?: string;
    covers: StepId[];
}
export interface Phase { key: string; name: string; from: string; to: string }

export const NUMBERED_STEPS: readonly NumberedStep[] = data.steps as NumberedStep[];
export const PHASES: readonly Phase[] = data.phases;
export const STEP_COUNT = NUMBERED_STEPS.length;

const byKey = (key: string): NumberedStep => {
    const s = NUMBERED_STEPS.find((x) => x.key === key);
    if (!s) throw new Error(`no step called "${key}" in data/steps.json`);
    return s;
};

/** Which numbered step each planner step belongs to: fold1 to fold4 are step 5, ovenOn and bake are step 9. */
export const STEP_BY_PLANNER_ID: Readonly<Record<string, NumberedStep>> =
    Object.fromEntries(NUMBERED_STEPS.flatMap((s) => s.covers.map((id) => [id, s])));

export const stepNumber = (key: string): number => byKey(key).number;
export const stepName = (key: string): string => byKey(key).name;
export const numberedStepFor = (id: StepId): NumberedStep => STEP_BY_PLANNER_ID[id]!;

export function phaseOf(key: string): Phase {
    const p = PHASES.find((x) => x.key === key);
    if (!p) throw new Error(`no phase called "${key}" in data/steps.json`);
    return p;
}
