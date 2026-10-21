// Helping you pick levers: the range of times, what fits your waking hours, and where to start.
import { ASSUMED_RATIO_N } from '../feeding';
import {
    FRIDGE_MAX_HOURS, FRIDGE_MIN_HOURS, WARMEST_TEMP, isQuickFeed, leversAt, ratioFor, type Levers
} from './levers';
import { fitsWakingHours } from './rules';
import { buildPlan, type Plan } from './steps';
import { HOUR, isAwake, type Zone } from './time';

type Base = Partial<Pick<Levers, 'doughTemp' | 'cooling' | 'size' | 'autolyseMin' | 'fermentolyseMin'>>;

export interface CarveRange {
    /** Quick feed, warmest dough, shortest fridge time: the genuinely fastest bake with the fridge. */
    fastest: Plan;
    /** The same with the fridge skipped. Quicker, but less sourdough. */
    noFridge: Plan;
    /** A standard feed, the default dough temperature and the longest fridge time. */
    slowest: Plan;
}

export function carveRange(startAt: number, base: Base = {}): CarveRange {
    const fast = { ...base, ratioN: 1, doughTemp: WARMEST_TEMP, starterDelayMin: 0 };
    return {
        fastest: buildPlan(leversAt(startAt, { ...fast, fridge: { kind: 'hours', hours: FRIDGE_MIN_HOURS } })),
        noFridge: buildPlan(leversAt(startAt, { ...fast, fridge: { kind: 'none' } })),
        slowest: buildPlan(leversAt(startAt, { ...base, fridge: { kind: 'hours', hours: FRIDGE_MAX_HOURS } }))
    };
}

export interface HoursRange { from: number; to: number }

const FRIDGE_STEP = 0.25;

/** The fridge times (in hours) that keep the oven, the bake and taking the loaf out inside waking hours. */
export function fridgeFit(levers: Levers, zone?: Zone): HoursRange[] {
    const ranges: HoursRange[] = [];
    let open: HoursRange | null = null;
    for (let h = FRIDGE_MIN_HOURS; h <= FRIDGE_MAX_HOURS + 1e-9; h += FRIDGE_STEP) {
        const p = buildPlan({ ...levers, fridge: { kind: 'hours', hours: h } });
        const ok = isAwake(p.byId.ovenOn, zone) && isAwake(p.byId.bake, zone) && isAwake(p.byId.out, zone);
        if (ok) {
            if (open) open.to = h; else { open = { from: h, to: h }; ranges.push(open); }
        } else open = null;
    }
    return ranges;
}

/** The fridge time nearest the one chosen that fits waking hours, or null if none does. */
export function nudgeFridge(levers: Levers, zone?: Zone): number | null {
    if (levers.fridge.kind !== 'hours') return null;
    const want = levers.fridge.hours;
    let best: number | null = null;
    for (const r of fridgeFit(levers, zone)) {
        for (const h of [Math.min(Math.max(want, r.from), r.to)]) {
            if (best === null || Math.abs(h - want) < Math.abs(best - want)) best = h;
        }
    }
    return best;
}

/**
 * Where to start for "Start a loaf now": the earliest bake that keeps everything in waking hours,
 * leaning away from quick feeds (each step below a standard feed counts as three hours).
 */
export function startNowLevers(startAt: number, base: Base = {}, zone?: Zone): Levers | null {
    let best: { levers: Levers; cost: number } | null = null;
    for (let n = 1; n <= 10; n++) {
        const width = (ratioFor(n).maxHours - ratioFor(n).minHours) * 60;
        for (let delay = 0; delay <= width + 1e-9; delay += 15) {
            const levers = leversAt(startAt, { ...base, ratioN: n, starterDelayMin: delay });
            const early = buildPlan({ ...levers, fridge: { kind: 'hours', hours: FRIDGE_MIN_HOURS } });
            const upToFridge = early.steps.filter((s) => !['ovenOn', 'bake', 'out', 'carve'].includes(s.id));
            if (!upToFridge.every((s) => isAwake(s.at, zone))) continue;
            const h = nudgeFridge(levers, zone);
            if (h === null) continue;
            const plan = buildPlan({ ...levers, fridge: { kind: 'hours', hours: h } });
            if (!fitsWakingHours(plan, { zone })) continue;
            const penalty = (isQuickFeed(n) ? (ASSUMED_RATIO_N - n) : Math.abs(ASSUMED_RATIO_N - n) / 2) * 3 * HOUR;
            const cost = plan.readyToCarve + penalty;
            if (!best || cost < best.cost) best = { levers: plan.levers, cost };
        }
    }
    return best ? best.levers : null;
}

