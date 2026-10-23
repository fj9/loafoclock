// How the night looks on both timelines (the bar across and the rail down), so they speak the same language:
// a soft violet band with bedtime at one edge and getting up at the other.
import { addLocalDays, atLocalTime, getWaking, startOfLocalDay, type Zone } from '../domain/plan';
import { clockOf } from './format';

export interface Night {
    /** The part of the night inside the stretch asked about. */
    from: number;
    to: number;
    /** Where the whole night runs from and to: bedtime and getting up. */
    bed: number;
    wake: number;
}

/** The sleeping hours that fall inside the stretch from `a` to `b`. */
export function nightsIn(a: number, b: number, zone: Zone): Night[] {
    const { fromMin, toMin } = getWaking();
    const found: Night[] = [];
    for (let d = addLocalDays(startOfLocalDay(a, zone), -1, zone); d < b; d = addLocalDays(d, 1, zone)) {
        const bed = atLocalTime(d, toMin, zone);
        const wake = atLocalTime(addLocalDays(d, 1, zone), fromMin, zone);
        if (bed < b && a < wake) found.push({ from: Math.max(a, bed), to: Math.min(b, wake), bed, wake });
    }
    return found;
}

export const Moon = () => <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M11 8.5A5 5 0 0 1 5.5 3a5 5 0 1 0 5.5 5.5z" fill="currentColor" /></svg>;
export const Sunrise = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M2 11h10M4.5 11a2.5 2.5 0 0 1 5 0M7 3v2M3 5.5l1 1M11 5.5l-1 1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
);

export const bedLabel = (n: Night, zone: Zone) => <><Moon /> Bedtime {clockOf(n.bed, zone)}</>;
export const wakeLabel = (n: Night, zone: Zone) => <><Sunrise /> Up {clockOf(n.wake, zone)}</>;
export const asleepLabel = (n: Night, zone: Zone) => <><Moon /> Asleep {clockOf(n.bed, zone)} to {clockOf(n.wake, zone)}</>;
