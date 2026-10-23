// Helping you pick levers: the range of times, what fits your waking hours, and where to start.
import { ASSUMED_RATIO_N } from '../feeding';
import {
    BULK_TABLE, DEFAULT_LEVERS, FRIDGE_MAX_HOURS, FRIDGE_MIN_HOURS, WARMEST_TEMP, isQuickFeed, leversAt, ratioFor, type Levers
} from './levers';
import { fitsWakingHours } from './rules';
import { buildPlan, type Plan } from './steps';
import { HOUR, MINUTE, isAwake, type Zone } from './time';

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

/** How much a degree away from the usual dough temperature counts against a plan, so it only moves when it pays. */
const TEMP_PENALTY_HOURS = 1;
const FEED_SLIDE_LIMIT = 24 * HOUR;

/** The best plan for feeding at exactly this moment, or null if nothing keeps you out of your sleeping hours. */
function bestFeedingAt(feedAt: number, base: Base, zone?: Zone): Levers | null {
    // A dough temperature given by the caller is the kitchen you have, so only the others are free to move.
    const temps = base.doughTemp !== undefined
        ? [base.doughTemp]
        : BULK_TABLE.map((r) => r.temp).sort((a, b) => Math.abs(a - DEFAULT_LEVERS.doughTemp) - Math.abs(b - DEFAULT_LEVERS.doughTemp));
    let best: { levers: Levers; cost: number } | null = null;
    for (const doughTemp of temps) {
        for (let n = 1; n <= 10; n++) {
            const width = (ratioFor(n).maxHours - ratioFor(n).minHours) * 60;
            for (let delay = 0; delay <= width + 1e-9; delay += 15) {
                const levers = leversAt(feedAt, { ...base, doughTemp, ratioN: n, starterDelayMin: delay });
                const early = buildPlan({ ...levers, fridge: { kind: 'hours', hours: FRIDGE_MIN_HOURS } });
                const upToFridge = early.steps.filter((s) => !['ovenOn', 'bake', 'out', 'carve'].includes(s.id));
                if (!upToFridge.every((s) => isAwake(s.at, zone))) continue;
                const feedPenalty = (isQuickFeed(n) ? (ASSUMED_RATIO_N - n) : Math.abs(ASSUMED_RATIO_N - n) / 2) * 3 * HOUR;
                const tempPenalty = base.doughTemp !== undefined ? 0 : Math.abs(DEFAULT_LEVERS.doughTemp - doughTemp) * TEMP_PENALTY_HOURS * HOUR;
                // The shortest fridge time is the best this feed can do, so skip the slower search if it already loses.
                if (best && early.readyToCarve + feedPenalty + tempPenalty >= best.cost) continue;
                const h = nudgeFridge(levers, zone);
                if (h === null) continue;
                const plan = buildPlan({ ...levers, fridge: { kind: 'hours', hours: h } });
                if (!fitsWakingHours(plan, { zone })) continue;
                const cost = plan.readyToCarve + feedPenalty + tempPenalty;
                if (!best || cost < best.cost) best = { levers: plan.levers, cost };
            }
        }
    }
    return best ? best.levers : null;
}

/**
 * Where to start for "Start a loaf now": the earliest bake that keeps everything you do in waking hours.
 * It tries every feed, wait, fridge time and dough temperature (leaning away from quick feeds, where each
 * step below a standard feed counts as three hours, and away from moving the dough temperature, which
 * counts as an hour a degree). If feeding right now can not work, say in the small hours, the first feed
 * slides to the next moment that can, so the answer is never a plan that breaks your sleep.
 */
export function startNowLevers(startAt: number, base: Base = {}, zone?: Zone): Levers | null {
    for (let at = startAt; at <= startAt + FEED_SLIDE_LIMIT; at += 15 * MINUTE) {
        if (!isAwake(at, zone)) continue;
        const found = bestFeedingAt(at, base, zone);
        if (found) return found;
    }
    return null;
}
