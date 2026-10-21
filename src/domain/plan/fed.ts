// A starter that was fed before you opened the app: the feed is a fact, the rest is planned from it.
import { FRIDGE_MIN_HOURS, leversAt, ratioFor, type Levers } from './levers';
import { nudgeFridge } from './hints';
import { fitsWakingHours } from './rules';
import { buildPlan, type Actuals } from './steps';
import { HOUR, MINUTE, isAwake, type Zone } from './time';

type Base = Partial<Pick<Levers, 'doughTemp' | 'cooling' | 'size' | 'autolyseMin' | 'fermentolyseMin' | 'loaves' | 'hydration'>>;

const DELAY_STEP = 15;

/** The most the starter can wait, in minutes after it is ready, before it is past its best. */
export const widthMinFor = (ratioN: number): number => (ratioFor(ratioN).maxHours - ratioFor(ratioN).minHours) * 60;

/**
 * The shortest wait (in minutes after the starter is ready) that does not put the autolyse in the
 * past. The autolyse comes before the starter goes in, so it has to start from `now` at the earliest.
 */
export function minDelayFor(fedAt: number, ratioN: number, autolyseMin: number, now: number): number {
    const readyAt = fedAt + ratioFor(ratioN).minHours * HOUR;
    const need = (now + autolyseMin * MINUTE - readyAt) / MINUTE;
    return Math.max(0, Math.ceil(need / DELAY_STEP - 1e-9) * DELAY_STEP);
}

export type StarterState = 'rising' | 'ready' | 'past';

/** Whether a starter fed at `fedAt` is still rising, in its ready window, or past it. */
export function starterState(fedAt: number, ratioN: number, now: number): StarterState {
    const r = ratioFor(ratioN);
    if (now < fedAt + r.minHours * HOUR) return 'rising';
    return now <= fedAt + r.maxHours * HOUR ? 'ready' : 'past';
}

/**
 * Levers for a starter fed at `fedAt` at 1:N:N: the earliest start from `now` that keeps every
 * step that needs you in waking hours, with the fridge time nudged to fit. Null if none fits.
 */
export function fedLevers(fedAt: number, ratioN: number, now: number, base: Base = {}, zone?: Zone): Levers | null {
    const first = leversAt(fedAt, { ...base, ratioN });
    const from = minDelayFor(fedAt, ratioN, first.autolyseMin, now);
    const to = Math.max(widthMinFor(ratioN), from);
    for (let delay = from; delay <= to + 1e-9; delay += DELAY_STEP) {
        const levers = { ...first, starterDelayMin: delay, fridge: { kind: 'hours', hours: FRIDGE_MIN_HOURS } as const };
        const early = buildPlan(levers);
        const upToFridge = early.steps.filter((s) => !['ovenOn', 'bake', 'out', 'carve', 'feed'].includes(s.id));
        if (!upToFridge.every((s) => isAwake(s.at, zone))) continue;
        const h = nudgeFridge(levers, zone);
        if (h === null) continue;
        const plan = buildPlan({ ...levers, fridge: { kind: 'hours', hours: h } }, fedActuals(fedAt));
        // The feed is in the past, so it is not held to waking hours.
        if (fitsWakingHours({ ...plan, steps: plan.steps.filter((s) => s.id !== 'feed') }, { zone })) return plan.levers;
    }
    return null;
}

/** The feed already done: ticked at the time you fed. */
export const fedActuals = (fedAt: number): Actuals => ({ feed: fedAt });
