// The rules a plan has to follow.
import { FRIDGE_MAX_HOURS, FRIDGE_MIN_HOURS, isQuickFeed } from './levers';
import type { Plan, StepId } from './steps';
import { HOUR, getWaking, isAwake, type Waking, type Zone } from './time';

/** The longest the loaf may rest between coming out of the oven and being carved. */
export const MAX_REST_BEFORE_CARVING_HOURS = 16;

export type Violation =
    | { kind: 'asleep'; stepId: StepId; at: number }
    | { kind: 'fridgeRange'; hours: number }
    | { kind: 'restTooLong'; hours: number };

export interface Rules {
    zone?: Zone;
    waking?: Waking;
    /** The time you want to carve. Defaults to as soon as the loaf is ready. */
    carveAt?: number;
}

/** Everything about the plan that breaks a rule. Empty means it is fine. */
export function violations(plan: Plan, rules: Rules = {}): Violation[] {
    const out: Violation[] = [];
    const waking = rules.waking ?? getWaking();
    for (const s of plan.steps) {
        if (s.needsYou && !isAwake(s.at, rules.zone, waking)) out.push({ kind: 'asleep', stepId: s.id, at: s.at });
    }
    if (plan.levers.fridge.kind === 'hours') {
        const h = plan.levers.fridge.hours;
        if (h < FRIDGE_MIN_HOURS - 1e-9 || h > FRIDGE_MAX_HOURS + 1e-9) out.push({ kind: 'fridgeRange', hours: h });
    }
    const carveAt = rules.carveAt ?? plan.readyToCarve;
    const rest = (carveAt - plan.byId.out) / HOUR;
    if (rest > MAX_REST_BEFORE_CARVING_HOURS + 1e-9) out.push({ kind: 'restTooLong', hours: rest });
    return out;
}

export const fitsWakingHours = (plan: Plan, rules: Rules = {}): boolean =>
    violations(plan, rules).every((v) => v.kind !== 'asleep');

export const isQuickFeedPlan = (plan: Plan): boolean => isQuickFeed(plan.levers.ratioN);
