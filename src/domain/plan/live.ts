// The live view: a locked plan, what has been ticked, and where you are in it now.
import { FRIDGE_MIN_HOURS, type Levers } from './levers';
import { buildPlan, type Actuals, type Plan, type Step, type StepId } from './steps';
import { HOUR, MINUTE } from './time';

/** How long after its time a step is "due" before it becomes "overdue". */
export const OVERDUE_AFTER_MIN = 10;

export type Status = 'done' | 'due' | 'overdue' | 'upcoming';

export interface LiveStep extends Step {
    status: Status;
    /** The plan as it stood when you locked it. */
    plannedAt: number;
    /** How much later (+) or earlier (-) this is now than first planned, in minutes. */
    shiftMin: number;
    actualAt?: number;
}

export interface KeepBakeTime {
    /** The fridge time that would keep the loaf coming out when first planned. */
    fridgeHours: number;
    /** False if that would be less than the 8 hour minimum. */
    possible: boolean;
}

export interface LiveView {
    plan: Plan;
    steps: LiveStep[];
    next: LiveStep | null;
    /** Milliseconds until the next step: negative when it is late. */
    untilNext: number | null;
    /** Time free before the next step needs you, or null if there is no next step. */
    freeMs: number | null;
    /** Offered when you are behind and the fridge could absorb it. */
    keepBakeTime: KeepBakeTime | null;
    locked: LockedLevers;
}

export interface LockedLevers {
    startTime: boolean;
    feedRatio: boolean;
    doughTemp: boolean;
    fridge: boolean;
    cooling: boolean;
}

/** Which levers can no longer change because the step they affect has happened. */
export function lockedLevers(actuals: Actuals): LockedLevers {
    return {
        startTime: actuals.feed !== undefined,
        feedRatio: actuals.feed !== undefined,
        doughTemp: actuals.preShape !== undefined,
        fridge: actuals.ovenOn !== undefined || actuals.bake !== undefined,
        cooling: actuals.out !== undefined
    };
}

export const isOpen = (id: StepId, actuals: Actuals): boolean => actuals[id] === undefined;

/**
 * Where you are. `original` is the plan at the moment it was locked (with the levers as they
 * were then); `levers` are the levers now, which may have been edited since.
 */
export function reconcile(original: Plan, levers: Levers, actuals: Actuals, now: number): LiveView {
    const plan = buildPlan(levers, actuals);
    const steps: LiveStep[] = plan.steps.map((s) => {
        const plannedAt = original.byId[s.id];
        const actualAt = actuals[s.id];
        let status: Status;
        if (actualAt !== undefined) status = 'done';
        else if (now < s.at) status = 'upcoming';
        else status = now - s.at > OVERDUE_AFTER_MIN * MINUTE ? 'overdue' : 'due';
        return {
            ...s, status, plannedAt, actualAt,
            shiftMin: Math.round(((actualAt ?? s.at) - plannedAt) / MINUTE)
        };
    });
    // The carve step has no tick of its own: it is ready when the cooling ends.
    const next = steps.find((s) => s.status !== 'done' && s.id !== 'carve') ?? null;
    const untilNext = next ? next.at - now : null;
    return {
        plan, steps, next, untilNext,
        freeMs: untilNext === null ? null : Math.max(0, untilNext),
        keepBakeTime: keepBakeTime(original, plan),
        locked: lockedLevers(actuals)
    };
}

/**
 * If things have slipped, how long could the fridge be to still bake at the planned time?
 * Null if the bake time has not moved, or the fridge is skipped.
 */
export function keepBakeTime(original: Plan, current: Plan): KeepBakeTime | null {
    if (current.levers.fridge.kind !== 'hours') return null;
    if (Math.abs(current.byId.bake - original.byId.bake) < 1 * MINUTE) return null;
    const fridgeHours = (original.byId.bake - current.byId.fridge) / HOUR;
    return { fridgeHours, possible: fridgeHours >= FRIDGE_MIN_HOURS - 1e-9 };
}

/** The levers with the fridge changed so the bake stays at the planned time (kept above the minimum). */
export function withKeptBakeTime(levers: Levers, k: KeepBakeTime): Levers {
    return { ...levers, fridge: { kind: 'hours', hours: Math.max(k.fridgeHours, FRIDGE_MIN_HOURS) } };
}

/** Ticks a step done at a moment you give (usually now, or "10 minutes ago"). */
export const tick = (actuals: Actuals, id: StepId, at: number): Actuals => ({ ...actuals, [id]: at });

/** Takes a tick back. */
export function untick(actuals: Actuals, id: StepId): Actuals {
    const { [id]: _removed, ...rest } = actuals;
    return rest;
}
