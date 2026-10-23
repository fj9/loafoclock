// What the quick time pickers share: the "feed time" picker on the New plan page and the "when did you do this?"
// picker in the Bake views.
import { MINUTE, addLocalDays, atLocalTime, type Zone } from '../domain/plan';

/** True on a phone or tablet, where the system's own time wheel is the best way to pick an exact time. */
export const touchScreen = (): boolean => typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(pointer: coarse)').matches;

/**
 * A time of day, put on the same day as `ref`, or the day before if that would be in the future (just after midnight,
 * or a wheel time that has not come yet today). A minute of leeway so a time picked as "now" is not pushed back a day.
 */
export function timeOnDayOf(ref: number, minutes: number, now: number, zone?: Zone): number {
    const t = atLocalTime(ref, minutes, zone);
    return t > now + MINUTE ? addLocalDays(t, -1, zone) : t;
}

export const floorMinute = (ms: number): number => Math.floor(ms / MINUTE) * MINUTE;
