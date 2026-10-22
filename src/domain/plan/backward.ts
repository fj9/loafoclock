// Working backwards: give a time to carve and get back plans that land on it.
import { ASSUMED_RATIO_N } from '../feeding';
import {
    FRIDGE_MAX_HOURS, FRIDGE_MIN_HOURS, STEP_MINUTES, bakeMinutesFor, bulkFor, isQuickFeed, leversAt, ratioFor,
    type Fridge, type Levers
} from './levers';
import { fitsWakingHours } from './rules';
import { buildPlan, type Plan } from './steps';
import { HOUR, MINUTE, atLocalTime, ceilTo, getWaking, isAwake, addLocalDays, type Zone } from './time';

export type Category = 'fresh' | 'moreFlavour' | 'bedtime' | 'noFridge';

export interface Candidate {
    category: Category;
    plan: Plan;
    quickFeed: boolean;
}

export interface BackwardInput {
    carveAt: number;
    zone?: Zone;
    /** The earliest the first feed can happen (usually now). */
    notBefore: number;
    /** Levers other than the timing, which the planner works out. */
    base?: Partial<Pick<Levers, 'doughTemp' | 'cooling' | 'size' | 'autolyseMin' | 'fermentolyseMin'>>;
    /** Offer a plan that skips the fridge. */
    allowNoFridge?: boolean;
}

const FEED_STEP = 30 * MINUTE;
const FRIDGE_STEP_HOURS = 0.25;
const MAX_REST_HOURS = 16;

/** Lowest score wins: a standard feed, then a middling time in the fridge. */
function score(l: Levers): number {
    const quick = isQuickFeed(l.ratioN) ? 1000 : 0;
    const fridge = l.fridge.kind === 'hours' ? Math.abs(l.fridge.hours - 14) : 0;
    return quick + Math.abs(l.ratioN - ASSUMED_RATIO_N) * 20 + l.starterDelayMin / 30 + fridge;
}

/**
 * Every plan that ends with the loaf out of the oven at `outAt`, with every moment that needs
 * you in waking hours, for each fridge time. Best first.
 */
function plansForOut(outAt: number, input: BackwardInput, fridges: Fridge[]): Plan[] {
    const zone = input.zone;
    const base = leversAt(0, input.base);
    const bake = outAt - bakeMinutesFor(base.size) * MINUTE;
    const bulk = bulkFor(base.doughTemp);
    const found: Plan[] = [];
    // The oven end of the chain does not depend on the fridge time
    if (!isAwake(bake, zone) || !isAwake(bake - STEP_MINUTES.preheat * MINUTE, zone) || !isAwake(outAt, zone)) return found;

    for (const fridge of fridges) {
        const proof = fridge.kind === 'none' ? STEP_MINUTES.counterProof * MINUTE : fridge.hours * HOUR;
        const fridgeIn = bake - proof;
        const finalShape = fridgeIn - STEP_MINUTES.finalShape * MINUTE;
        const preShape = finalShape - STEP_MINUTES.preShape * MINUTE;
        const starterIn = preShape - bulk.hours * HOUR;
        if (![fridgeIn, finalShape, preShape].every((t) => isAwake(t, zone))) continue;
        const salt = starterIn + base.fermentolyseMin * MINUTE;
        const fold1 = salt + STEP_MINUTES.saltRest * MINUTE;
        const folds = [fold1, fold1 + 30 * MINUTE, fold1 + 60 * MINUTE, fold1 + 90 * MINUTE];
        if (![starterIn, starterIn - base.autolyseMin * MINUTE, salt, ...folds].every((t) => isAwake(t, zone))) continue;

        for (let n = 1; n <= 10; n++) {
            const r = ratioFor(n);
            const from = starterIn - r.maxHours * HOUR;
            const to = starterIn - r.minHours * HOUR;
            for (let feed = Math.max(ceilTo(from, FEED_STEP), ceilTo(input.notBefore, FEED_STEP)); feed <= to + 1e-6; feed += FEED_STEP) {
                if (!isAwake(feed, zone)) continue;
                const levers: Levers = {
                    ...base, feedAt: feed, ratioN: n, fridge,
                    starterDelayMin: (starterIn - feed - r.minHours * HOUR) / MINUTE
                };
                const plan = buildPlan(levers);
                if (fitsWakingHours(plan, { zone })) found.push(plan);
            }
        }
    }
    return found.sort((a, b) => score(a.levers) - score(b.levers));
}

const allFridges = (): Fridge[] => {
    const list: Fridge[] = [];
    for (let h = FRIDGE_MIN_HOURS; h <= FRIDGE_MAX_HOURS + 1e-9; h += FRIDGE_STEP_HOURS) list.push({ kind: 'hours', hours: h });
    return list;
};

/** The latest evening times (the last three hours before bed) the loaf could come out, in quarter hours, that still leave a rest of at most 16 hours. */
function bedtimeOuts(carveAt: number, cooling: number, zone: Zone): number[] {
    const outs: number[] = [];
    const evening = (dayMs: number, min: number) => atLocalTime(dayMs, min, zone);
    for (const dayMs of [carveAt, addLocalDays(carveAt, -1, zone)]) {
        for (let m = getWaking().toMin; m >= getWaking().toMin - 3 * 60; m -= 15) {
            const out = evening(dayMs, m);
            const rest = (carveAt - out) / HOUR;
            // More than a night of rest, so it is a different plan from baking fresh
            if (rest >= cooling / 60 + 4 && rest <= MAX_REST_HOURS) outs.push(out);
        }
    }
    return outs.sort((a, b) => b - a);
}

/** Plans that land on the carve time, best first, one per kind of plan. */
export function planBackward(input: BackwardInput): Candidate[] {
    const base = leversAt(0, input.base);
    const out: Candidate[] = [];
    const fridges = allFridges();
    const wrap = (category: Category, plan: Plan): Candidate => ({ category, plan, quickFeed: isQuickFeed(plan.levers.ratioN) });

    // Fresh: out of the oven, cooled, and carved.
    const freshOut = input.carveAt - base.cooling * MINUTE;
    const fresh = plansForOut(freshOut, input, fridges);
    if (fresh[0]) {
        out.push(wrap('fresh', fresh[0]));
        // More flavour: a plan with a standard feed and the longest fridge time, if it is much longer
        const standard = fresh.filter((p) => !isQuickFeed(p.levers.ratioN));
        const long = standard.sort((a, b) => b.fridgeHours - a.fridgeHours)[0];
        if (long && long.fridgeHours >= fresh[0].fridgeHours + 12) out.push(wrap('moreFlavour', long));
    }

    // Bedtime: out of the oven in the evening and carved the next morning.
    for (const o of bedtimeOuts(input.carveAt, base.cooling, input.zone)) {
        const plans = plansForOut(o, input, fridges);
        if (plans[0]) { out.push(wrap('bedtime', plans[0])); break; }
    }

    if (input.allowNoFridge) {
        const none = plansForOut(freshOut, input, [{ kind: 'none' }]);
        if (none[0]) out.push(wrap('noFridge', none[0]));
    }
    return out;
}

