// Rest lengths for autolyse and fermentolyse: 30 to 60 minutes, 60 by default.
import { clockAfter, parseClock, type ClockResult } from './feeding';

export const REST_MIN = 30;
export const REST_MAX = 60;
export const REST_DEFAULT = 60;

export function clampRest(minutes: number | string): number {
    const n = Math.round(Number(minutes));
    return Number.isFinite(n) ? Math.min(REST_MAX, Math.max(REST_MIN, n)) : REST_DEFAULT;
}

export const restText = (minutes: number): string => (minutes === 60 ? '1 hour' : `${minutes} minutes`);

/**
 * The longest rest (up to the default hour) that ends on the hour or half hour, so the steps
 * after it land on tidy clock times. Any 31 consecutive minutes include a multiple of 30,
 * so there is always one.
 */
export function tidyRest(startTime: string): { minutes: number; end: ClockResult } {
    const start = parseClock(startTime);
    for (let d = REST_MAX; d >= REST_MIN; d--) {
        if ((start + d) % 30 === 0) return { minutes: d, end: clockAfter(startTime, d / 60) };
    }
    return { minutes: REST_DEFAULT, end: clockAfter(startTime, REST_DEFAULT / 60) };
}

/** When a rest of `minutes` started at `startTime` ends. */
export const restEnd = (startTime: string, minutes: number): ClockResult => clockAfter(startTime, minutes / 60);

/** Minutes from the start of fermentolyse until the first fold: the rest, then 30 min for the salt. */
export const FOLD_DELAY_AFTER_REST_MIN = 30;
export const firstFoldMinutes = (fermentolyseMinutes: number): number => fermentolyseMinutes + FOLD_DELAY_AFTER_REST_MIN;
/** Hours of bulk already done by the end of the folds: rest + salt rest + the 4 folds (1.5h). */
export const bulkHoursBeforeRemaining = (fermentolyseMinutes: number): number => (firstFoldMinutes(fermentolyseMinutes) + 90) / 60;
