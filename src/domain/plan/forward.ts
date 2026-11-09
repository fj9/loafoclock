// Working forwards: give a time to feed and get back the ways the bake could go, each with when you could carve.
import { ASSUMED_RATIO_N } from '../feeding';
import {
    BULK_TABLE, DEFAULT_LEVERS, FRIDGE_MAX_HOURS, FRIDGE_MIN_HOURS, QUICK_FEED_MAX_N, isQuickFeed, leversAt, ratioFor,
    type Fridge, type Levers
} from './levers';
import { fitsWakingHours } from './rules';
import { buildPlan, type Plan } from './steps';
import { HOUR, MINUTE, isAwake, type Zone } from './time';

export type ForwardCategory = 'fastest' | 'balanced' | 'moreFlavour' | 'noFridge';

export interface ForwardOption {
    category: ForwardCategory;
    plan: Plan;
    quickFeed: boolean;
}

export interface ForwardInput {
    feedAt: number;
    zone?: Zone;
    /** Levers other than the timing, which the planner works out. */
    base?: Partial<Pick<Levers, 'doughTemp' | 'cooling' | 'size' | 'autolyseMin' | 'fermentolyseMin' | 'loaves' | 'hydration'>>;
}

export interface ForwardMissing {
    category: 'balanced' | 'moreFlavour';
    why:
        /** Nothing of this kind keeps every step out of your sleeping hours. */
        | 'noFit'
        /** No fridge stay 12 hours or more longer than the usual overnight one fits. */
        | 'noLongerFridge';
}

export interface ForwardResult {
    /** Soonest carve first. */
    options: ForwardOption[];
    /** The kinds of plan not offered, and why. Empty if there are no options at all, since that is its own message. */
    missing: ForwardMissing[];
    /** The feed time itself falls in your sleeping hours. */
    asleep: boolean;
}

/** The fridge stay a "balanced" plan aims for: overnight. */
const OVERNIGHT_HOURS = 14;
/** The longest fridge stay offered for more flavour. Beyond this the loaf is days away. */
const FLAVOUR_MAX_HOURS = 36;
/** How much longer than the balanced plan's stay a "more flavour" one has to be. */
const FLAVOUR_EXTRA_HOURS = 12;
const DELAY_STEP_MIN = 30;
const FRIDGE_STEP_HOURS = 0.25;
const NUDGE_STEP = 30 * MINUTE;
const NUDGE_WINDOW = 4 * HOUR;
/** A different feed time is only worth mentioning if it brings the fastest bread forward by at least this. */
const NUDGE_MIN_SAVING = 2 * HOUR;

type Base = NonNullable<ForwardInput['base']>;

const wrap = (category: ForwardCategory, plan: Plan): ForwardOption => ({ category, plan, quickFeed: isQuickFeed(plan.levers.ratioN) });

/** Fits your waking hours, and you are up to carve it too. */
const fits = (plan: Plan, zone: Zone): boolean => fitsWakingHours(plan, { zone }) && isAwake(plan.readyToCarve, zone);

/** The shortest fridge stay (from the minimum, up to the flavour limit) for which the whole plan fits, or null. */
function shortestFit(levers: Levers, zone: Zone): Plan | null {
    for (let h = FRIDGE_MIN_HOURS; h <= FLAVOUR_MAX_HOURS + 1e-9; h += FRIDGE_STEP_HOURS) {
        const plan = buildPlan({ ...levers, fridge: { kind: 'hours', hours: h } });
        if (fits(plan, zone)) return plan;
    }
    return null;
}

/** Every step before the fridge needs you in waking hours, whatever the fridge time turns out to be. */
const awakeUpToFridge = (plan: Plan, zone: Zone): boolean =>
    plan.steps.filter((s) => s.needsYou && !['ovenOn', 'bake', 'out', 'carve'].includes(s.id)).every((s) => isAwake(s.at, zone));

/** The soonest carve for this feed, with the fridge, trying every feed ratio, wait and dough temperature. */
function fastestAt(feedAt: number, base: Base, zone: Zone): Plan | null {
    const temps = base.doughTemp !== undefined ? [base.doughTemp] : BULK_TABLE.map((r) => r.temp);
    let best: Plan | null = null;
    for (const doughTemp of temps) {
        for (let n = 1; n <= 10; n++) {
            const width = (ratioFor(n).maxHours - ratioFor(n).minHours) * 60;
            for (let delay = 0; delay <= width + 1e-9; delay += DELAY_STEP_MIN) {
                const levers = leversAt(feedAt, { ...base, doughTemp, ratioN: n, starterDelayMin: delay });
                const early = buildPlan({ ...levers, fridge: { kind: 'hours', hours: FRIDGE_MIN_HOURS } });
                if (best && early.readyToCarve >= best.readyToCarve) continue;
                if (!awakeUpToFridge(early, zone)) continue;
                const plan = shortestFit(levers, zone);
                if (!plan) continue;
                if (!best || plan.readyToCarve < best.readyToCarve) best = plan;
            }
        }
    }
    return best;
}

/** The soonest carve with no fridge at all, which gives less sourdough flavour. */
function noFridgeAt(feedAt: number, base: Base, zone: Zone): Plan | null {
    const temps = base.doughTemp !== undefined ? [base.doughTemp] : BULK_TABLE.map((r) => r.temp);
    const none: Fridge = { kind: 'none' };
    let best: Plan | null = null;
    for (const doughTemp of temps) {
        for (let n = 1; n <= 10; n++) {
            const width = (ratioFor(n).maxHours - ratioFor(n).minHours) * 60;
            for (let delay = 0; delay <= width + 1e-9; delay += DELAY_STEP_MIN) {
                const plan = buildPlan(leversAt(feedAt, { ...base, doughTemp, ratioN: n, starterDelayMin: delay, fridge: none }));
                if (best && plan.readyToCarve >= best.readyToCarve) continue;
                if (fits(plan, zone)) best = plan;
            }
        }
    }
    return best;
}

/** Plans with a standard feed and the usual dough temperature, for every fridge time that fits. */
function standardPlans(feedAt: number, base: Base, zone: Zone): Plan[] {
    const doughTemp = base.doughTemp ?? DEFAULT_LEVERS.doughTemp;
    const found: Plan[] = [];
    for (let n = QUICK_FEED_MAX_N + 1; n <= 10; n++) {
        const width = (ratioFor(n).maxHours - ratioFor(n).minHours) * 60;
        for (let delay = 0; delay <= width + 1e-9; delay += DELAY_STEP_MIN) {
            const levers = leversAt(feedAt, { ...base, doughTemp, ratioN: n, starterDelayMin: delay });
            if (!awakeUpToFridge(buildPlan({ ...levers, fridge: { kind: 'hours', hours: FRIDGE_MIN_HOURS } }), zone)) continue;
            for (let h = FRIDGE_MIN_HOURS; h <= Math.min(FRIDGE_MAX_HOURS, FLAVOUR_MAX_HOURS) + 1e-9; h += FRIDGE_STEP_HOURS) {
                const plan = buildPlan({ ...levers, fridge: { kind: 'hours', hours: h } });
                if (fits(plan, zone)) found.push(plan);
            }
        }
    }
    return found;
}

/** A standard feed near the usual one is better; the nearer to the usual wait the better. */
const feedCost = (l: Levers): number => Math.abs(l.ratioN - ASSUMED_RATIO_N) * 20 + l.starterDelayMin / 30;
const byCost = (cost: (p: Plan) => number) => (a: Plan, b: Plan) => cost(a) - cost(b);

/** Whether this feed time is in your waking hours. */
export const feedTimeIsAwake = (feedAt: number, zone?: Zone): boolean => isAwake(feedAt, zone);

/** The ways a bake could go if you feed at this moment, soonest carve first. */
export function planForward(input: ForwardInput): ForwardResult {
    const { feedAt, zone } = input;
    const base = input.base ?? {};
    if (!isAwake(feedAt, zone)) return { options: [], missing: [], asleep: true };

    const options: ForwardOption[] = [];
    const missing: ForwardMissing[] = [];
    const standard = standardPlans(feedAt, base, zone);

    // Balanced: the fridge stay nearest overnight, with the feed nearest the usual.
    const balanced = [...standard].sort(byCost((p) => Math.abs(p.fridgeHours - OVERNIGHT_HOURS) * 10 + feedCost(p.levers)))[0];
    if (balanced) {
        options.push(wrap('balanced', balanced));
        // More flavour: the longest stay that fits, if it is much longer.
        const longest = standard.filter((p) => p.fridgeHours >= balanced.fridgeHours + FLAVOUR_EXTRA_HOURS)
            .sort(byCost((p) => -p.fridgeHours * 100 + feedCost(p.levers)))[0];
        if (longest) options.push(wrap('moreFlavour', longest));
        else missing.push({ category: 'moreFlavour', why: 'noLongerFridge' });
    } else {
        missing.push({ category: 'balanced', why: 'noFit' });
    }

    // Fastest: whatever gets you bread soonest, with the fridge. Left out when balanced is just as quick.
    const fastest = fastestAt(feedAt, base, zone);
    if (fastest && !(balanced && balanced.readyToCarve <= fastest.readyToCarve)) options.push(wrap('fastest', fastest));

    const none = noFridgeAt(feedAt, base, zone);
    if (none) options.push(wrap('noFridge', none));

    options.sort((a, b) => a.plan.readyToCarve - b.plan.readyToCarve);
    return { options, missing: options.length > 0 ? missing : [], asleep: false };
}

export interface FeedNudge {
    /** An earlier feed time. */
    feedAt: number;
    /** When the fastest bread would then be ready to carve. */
    readyToCarve: number;
}

/**
 * An earlier feed time (within a few hours, and not before `notBefore`) that brings the fastest bread
 * forward by at least two hours, or null if feeding when you chose is already about as good.
 */
export function earlierFeedNudge(input: ForwardInput & { notBefore: number }): FeedNudge | null {
    const { feedAt, zone, notBefore } = input;
    const base = input.base ?? {};
    const here = isAwake(feedAt, zone) ? fastestAt(feedAt, base, zone) : null;
    const ceiling = here ? here.readyToCarve - NUDGE_MIN_SAVING : Infinity;
    let best: FeedNudge | null = null;
    for (let at = feedAt - NUDGE_STEP; at >= feedAt - NUDGE_WINDOW; at -= NUDGE_STEP) {
        if (at < notBefore || !isAwake(at, zone)) continue;
        const p = fastestAt(at, base, zone);
        if (p && p.readyToCarve <= ceiling && (!best || p.readyToCarve < best.readyToCarve)) best = { feedAt: at, readyToCarve: p.readyToCarve };
    }
    return best;
}

/** The first waking moment at or after this one, on a quarter-hour. */
export function nextAwake(at: number, zone?: Zone): number {
    const step = 15 * MINUTE;
    let t = Math.ceil(at / step) * step;
    for (let i = 0; i < 24 * 4 && !isAwake(t, zone); i++) t += step;
    return t;
}
