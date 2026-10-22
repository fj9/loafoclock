// The things you can change (the levers) and the numbers behind them.
import { findRatio, type FeedingRatio } from '../feeding';
import { bakePlan, type LoafSize } from '../recipe';
import { HOUR, MINUTE } from './time';

/** Dough temperature (°C) to hours of bulk fermentation and the rise to look for. */
export const BULK_TABLE: ReadonlyArray<{ temp: number; hours: number; rise: number }> = [
    { temp: 27, hours: 5.5, rise: 50 }, { temp: 26, hours: 5.5, rise: 50 },
    { temp: 25.5, hours: 6, rise: 50 }, { temp: 25, hours: 6, rise: 50 },
    { temp: 24.5, hours: 7, rise: 50 }, { temp: 24, hours: 7, rise: 50 },
    { temp: 23, hours: 8, rise: 50 }, { temp: 22.5, hours: 9, rise: 50 },
    { temp: 22, hours: 10, rise: 50 }, { temp: 21.5, hours: 11, rise: 50 },
    { temp: 21, hours: 12, rise: 75 }, { temp: 20.5, hours: 13, rise: 75 },
    { temp: 20, hours: 14, rise: 75 }, { temp: 19.5, hours: 15, rise: 75 },
    { temp: 19, hours: 16, rise: 75 }, { temp: 18, hours: 16, rise: 75 }
];
export const WARMEST_TEMP = 27;
export const COOLEST_TEMP = 18;

/** The row for the closest temperature in the table. */
export function bulkFor(temp: number): { temp: number; hours: number; rise: number } {
    let best = BULK_TABLE[0]!;
    for (const row of BULK_TABLE) if (Math.abs(row.temp - temp) < Math.abs(best.temp - temp)) best = row;
    return best;
}

/** Fixed lengths of the steps in between, in minutes. */
export const STEP_MINUTES = {
    saltRest: 30,     // fermentolyse ends, salt goes in, then this long to the first fold
    foldGap: 30,
    foldCount: 4,
    preShape: 30,     // bench rest between pre-shape and final shape
    finalShape: 15,   // final shape to the dough going in the fridge
    preheat: 45,
    counterProof: 150 // proofing on the counter when the fridge is skipped (about 2 to 3 hours)
} as const;

export const FRIDGE_MIN_HOURS = 8;
export const FRIDGE_MAX_HOURS = 72;
export const COOLING_CHOICES = [30, 60] as const;
export type Cooling = (typeof COOLING_CHOICES)[number];
/** At or below this many parts a feed counts as a quick feed. */
export const QUICK_FEED_MAX_N = 3;

export type Fridge = { kind: 'hours'; hours: number } | { kind: 'none' };

export interface Levers {
    /** When the first feed happens (a real moment, ms since 1970). */
    feedAt: number;
    /** The feed is 1:N:N. */
    ratioN: number;
    /** Minutes after the starter first reaches the ready window that it goes into the dough. */
    starterDelayMin: number;
    doughTemp: number;
    fridge: Fridge;
    cooling: Cooling;
    size: LoafSize;
    autolyseMin: number;
    fermentolyseMin: number;
    /** How many loaves, baked together (1 if not set). Only changes the amounts. */
    loaves?: 1 | 2;
    /** Total dough hydration in percent (70 if not set). Only changes the water. */
    hydration?: number;
}

export const DEFAULT_LEVERS: Omit<Levers, 'feedAt'> = {
    ratioN: 6, starterDelayMin: 0, doughTemp: 24, fridge: { kind: 'hours', hours: FRIDGE_MIN_HOURS },
    cooling: 60, size: 'regular', autolyseMin: 60, fermentolyseMin: 60
};

export const leversAt = (feedAt: number, over: Partial<Omit<Levers, 'feedAt'>> = {}): Levers =>
    ({ ...DEFAULT_LEVERS, ...over, feedAt });

export function ratioFor(n: number): FeedingRatio {
    const r = findRatio(`1:${n}:${n}`);
    if (!r) throw new Error(`no feeding ratio 1:${n}:${n}`);
    return r;
}

export const isQuickFeed = (n: number): boolean => n <= QUICK_FEED_MAX_N;
export const bakeMinutesFor = (size: LoafSize): number => bakePlan({ size }).totalMinutes;
export const minutes = (n: number): number => n * MINUTE;
export const hours = (n: number): number => n * HOUR;

// ---- One slider for the feed: hours from feeding to adding the starter ----
/** The shortest and longest wait the chart covers: 1:1:1 is ready at 4 hours, 1:10:10 is still good at 16. */
export const WAIT_MIN_HOURS = 4;
export const WAIT_MAX_HOURS = 16;
const WAIT_STEP_MIN = 15;

/** Hours from the feed to the starter going into the dough. */
export const waitHoursOf = (l: Pick<Levers, 'ratioN' | 'starterDelayMin'>): number => ratioFor(l.ratioN).minHours + l.starterDelayMin / 60;

/**
 * The feed that has the starter ready after this many hours: the ratio whose ready window is
 * centred nearest, and how long after the window opens to add it. As the wait grows the ratio drifts up.
 */
export function feedForWait(hours: number): { ratioN: number; starterDelayMin: number } {
    const h = Math.min(Math.max(hours, WAIT_MIN_HOURS), WAIT_MAX_HOURS);
    let best = { n: 1, dist: Infinity };
    for (let n = 1; n <= 10; n++) {
        const r = ratioFor(n);
        if (h < r.minHours - 1e-9 || h > r.maxHours + 1e-9) continue;
        const dist = Math.abs((r.minHours + r.maxHours) / 2 - h);
        if (dist < best.dist - 1e-9) best = { n, dist };
    }
    const delay = Math.round(((h - ratioFor(best.n).minHours) * 60) / WAIT_STEP_MIN) * WAIT_STEP_MIN;
    return { ratioN: best.n, starterDelayMin: delay };
}
