// Real moments in time (milliseconds since 1970) and local wall-clock time.
//
// The plan adds elapsed time (a 9 hour rise is 9 hours whatever the clocks do) and then asks what
// the local clock says at that moment. That is what makes a plan that crosses the clocks changing
// come out right. Everything here takes an optional IANA time zone ("Europe/London"). Leave it out
// to use this device's zone; tests pass one so they do not depend on the machine.

export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export type Zone = string | undefined;

export interface LocalParts {
    year: number;
    month: number; // 1 to 12
    day: number;
    hour: number;
    minute: number;
    second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: Zone): Intl.DateTimeFormat {
    const key = zone ?? '';
    let f = formatters.get(key);
    if (!f) {
        f = new Intl.DateTimeFormat('en-GB', {
            ...(zone ? { timeZone: zone } : {}),
            hourCycle: 'h23',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        });
        formatters.set(key, f);
    }
    return f;
}

/** What the wall clock says in `zone` at moment `ms`. */
export function partsOf(ms: number, zone: Zone = undefined): LocalParts {
    const out: Record<string, number> = {};
    for (const p of formatter(zone).formatToParts(new Date(ms))) {
        if (p.type !== 'literal') out[p.type] = Number(p.value);
    }
    return {
        year: out.year!, month: out.month!, day: out.day!,
        hour: out.hour!, minute: out.minute!, second: out.second!
    };
}

/** How far the local clock is ahead of UTC at moment `ms`, in milliseconds. */
export function offsetMs(ms: number, zone: Zone = undefined): number {
    const p = partsOf(ms, zone);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/**
 * The moment at which the local clock in `zone` reads this date and time. A time that happens
 * twice when the clocks go back gives the later one; a time skipped when they go forward gives the
 * moment just after the gap.
 */
export function zonedToMs(
    p: { year: number; month: number; day: number; hour?: number; minute?: number },
    zone: Zone = undefined
): number {
    const guess = Date.UTC(p.year, p.month - 1, p.day, p.hour ?? 0, p.minute ?? 0);
    const first = guess - offsetMs(guess, zone);
    const second = guess - offsetMs(first, zone);
    return second;
}

/** Minutes since local midnight, 0 to 1439. */
export function minutesOfDay(ms: number, zone: Zone = undefined): number {
    const p = partsOf(ms, zone);
    return p.hour * 60 + p.minute;
}

/** The local calendar date as a number of days since 1970, so two moments on the same date match. */
export function localDayNumber(ms: number, zone: Zone = undefined): number {
    const p = partsOf(ms, zone);
    return Math.floor(Date.UTC(p.year, p.month - 1, p.day) / DAY);
}

/** Midnight at the start of the local day that `ms` falls on. */
export function startOfLocalDay(ms: number, zone: Zone = undefined): number {
    const p = partsOf(ms, zone);
    return zonedToMs({ year: p.year, month: p.month, day: p.day }, zone);
}

/** The same wall-clock time, `n` calendar days later (so 22:00 stays 22:00 across a clock change). */
export function addLocalDays(ms: number, n: number, zone: Zone = undefined): number {
    const p = partsOf(ms, zone);
    return zonedToMs({ year: p.year, month: p.month, day: p.day + n, hour: p.hour, minute: p.minute }, zone);
}

/** A moment on a given local date at a given time of day. */
export function atLocalTime(ms: number, minuteOfDay: number, zone: Zone = undefined): number {
    const p = partsOf(ms, zone);
    return zonedToMs({ year: p.year, month: p.month, day: p.day, hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60 }, zone);
}

/** The first multiple of `stepMs` at or after `ms`. */
export const ceilTo = (ms: number, stepMs: number): number => Math.ceil(ms / stepMs) * stepMs;

// ---- Waking hours ----
export interface Waking {
    fromMin: number; // minutes since midnight, inclusive
    toMin: number;   // inclusive
}

/** Every moment that needs you must fall between 6:00 am and 11:00 pm. */
export const DEFAULT_WAKING: Waking = { fromMin: 6 * 60, toMin: 23 * 60 };

export function isAwake(ms: number, zone: Zone = undefined, waking: Waking = DEFAULT_WAKING): boolean {
    const m = minutesOfDay(ms, zone);
    return m >= waking.fromMin && m <= waking.toMin;
}
