// The things you can change (the levers) and the numbers behind them.
import { findRatio, type FeedingRatio } from '../feeding';
import { bakePlan, type LoafSize } from '../recipe';
import { HOUR, MINUTE } from './time';
import bulkData from '../../../data/bulk.json';
import timing from '../../../data/timing.json';
import finalProofData from '../../../data/final-proof.json';

/** One bulk row: the clock window (hours, from the starter going in) and the rise to look for. `hours` is the longer end, which is what the planner schedules. */
export interface BulkRow { temp: number; minHours: number; maxHours: number; hours: number; rise: number }

/** Dough temperature (°C) to the hours of bulk fermentation and the rise to look for. */
export const BULK_TABLE: ReadonlyArray<BulkRow> = bulkData.rows.map((r) => ({ ...r, hours: r.maxHours }));
export const WARMEST_TEMP = Math.max(...BULK_TABLE.map((r) => r.temp));
export const COOLEST_TEMP = Math.min(...BULK_TABLE.map((r) => r.temp));
/** What to say below the coolest and above the warmest row, where the table gives no clock time. */
export const BULK_TOO_COOL = bulkData.tooCool;
export const BULK_TOO_WARM = bulkData.tooWarm;

/** The row for the closest temperature in the table (the nearest end if the temperature is off the table). */
export function bulkFor(temp: number): BulkRow {
    let best = BULK_TABLE[0]!;
    for (const row of BULK_TABLE) if (Math.abs(row.temp - temp) < Math.abs(best.temp - temp)) best = row;
    return best;
}

/** Minutes of proofing on the counter when the fridge is skipped: the longer end of the final proof range, taking the dough temperature as the room temperature. */
export const counterProofMinutes = (doughTemp: number): number => Math.round(finalProofFor(doughTemp).maxHours * 60);

/**
 * Minutes from the starter going in to the end of bulk (the pre-shape): the longer end of the range for the dough
 * temperature, but never so short that the last fold does not get its half hour before the pre-shape.
 */
export function bulkMinutesFor(doughTemp: number, fermentolyseMin: number): number {
    const lastFoldAndGap = fermentolyseMin + STEP_MINUTES.saltRest + (STEP_MINUTES.foldCount - 1) * STEP_MINUTES.foldGap + STEP_MINUTES.foldGap;
    return Math.max(bulkFor(doughTemp).hours * 60, lastFoldAndGap);
}

/** "3 to 5": a range of hours written for text. */
export const hoursRangeText = (r: { minHours: number; maxHours: number }): string =>
    r.minHours === r.maxHours ? `${r.maxHours}` : `${r.minHours} to ${r.maxHours}`;

/** Hours as handbook prose: whole hours stay as digits, half hours are spelled out ("4 and a half"). */
const hoursWords = (h: number, alone: boolean): string => {
    const whole = Math.floor(h);
    if (h === whole) return `${h}`;
    if (whole === 0) return alone ? 'half an hour' : 'half';
    return `${whole} and a half`;
};

/** "4 and a half to 6 and a half hours": a range of hours written for handbook prose, with its unit. */
export const hoursRangeProse = (r: { minHours: number; maxHours: number }): string => {
    if (r.minHours === r.maxHours) return r.maxHours === 1 ? '1 hour' : r.maxHours === 0.5 ? 'half an hour' : `${hoursWords(r.maxHours, true)} hours`;
    const min = r.minHours === 0.5 ? 'half an hour' : hoursWords(r.minHours, false);
    return `${min} to ${hoursWords(r.maxHours, false)} ${r.maxHours === 1 ? 'hour' : 'hours'}`;
};

/** Room temperature (°C) to the hours of final proof at room temperature, for shaped dough that skips the fridge. */
export const FINAL_PROOF_TABLE: ReadonlyArray<{ temp: number; minHours: number; maxHours: number }> = finalProofData.rows;

/** The final proof row for the closest room temperature in the table. */
export function finalProofFor(temp: number): { temp: number; minHours: number; maxHours: number } {
    let best = FINAL_PROOF_TABLE[0]!;
    for (const row of FINAL_PROOF_TABLE) if (Math.abs(row.temp - temp) < Math.abs(best.temp - temp)) best = row;
    return best;
}

/** Fixed lengths of the steps in between, in minutes. */
export const STEP_MINUTES = timing.stepMinutes;
// saltRest: fermentolyse ends, salt goes in, then this long to the first fold
// preShape: bench rest between pre-shape and final shape
// finalShape: final shape to the dough going in the fridge

export const FRIDGE_MIN_HOURS = timing.fridgeHours.min;
export const FRIDGE_MAX_HOURS = timing.fridgeHours.max;
export const COOLING_CHOICES = timing.coolingChoices as readonly Cooling[];
export type Cooling = 30 | 60;
/** At or below this many parts a feed counts as a quick feed. */
export const QUICK_FEED_MAX_N = timing.quickFeedMaxN;

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
export const WAIT_MIN_HOURS = timing.waitHours.min;
export const WAIT_MAX_HOURS = timing.waitHours.max;
const WAIT_STEP_MIN = timing.waitHours.stepMin;

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
