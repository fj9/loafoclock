// Writing moments and lengths of time for the screen.
import { fmtTime } from '../domain/clock';
import { localDayNumber, partsOf, type Zone } from '../domain/plan';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** "7:30 am" (or "07:30" if that is the chosen style) */
export function clockOf(ms: number, zone?: Zone): string {
    const p = partsOf(ms, zone);
    return fmtTime(`${pad(p.hour)}:${pad(p.minute)}`);
}

export function weekdayOf(ms: number, zone?: Zone): string {
    const p = partsOf(ms, zone);
    return DAYS[new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()]!;
}

/** "Today", "Tomorrow", or "Sat 24 Oct" */
export function dayLabel(ms: number, now: number, zone?: Zone): string {
    const diff = localDayNumber(ms, zone) - localDayNumber(now, zone);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    const p = partsOf(ms, zone);
    return `${weekdayOf(ms, zone)} ${p.day} ${MONTHS[p.month - 1]}`;
}

/** "Sat 7:30 am" for a moment within the next week, with the weekday only. */
export function whenOf(ms: number, zone?: Zone): string {
    return `${weekdayOf(ms, zone)} ${clockOf(ms, zone)}`;
}

/** "19 h 45 m", "8 h", "40 m" */
export function lengthOf(ms: number): string {
    const total = Math.round(ms / 60_000);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (!h) return `${m} m`;
    return m ? `${h} h ${m} m` : `${h} h`;
}

/** For a day chip: "Today", "Tomorrow", or "Sat 24" */
export function chipDay(ms: number, now: number, zone?: Zone): string {
    const label = dayLabel(ms, now, zone);
    return label === 'Today' || label === 'Tomorrow' ? label : `${weekdayOf(ms, zone)} ${partsOf(ms, zone).day}`;
}

/** "Sunday 25 October" */
export function fullDay(ms: number, zone?: Zone): string {
    const p = partsOf(ms, zone);
    const name = new Date(Date.UTC(p.year, p.month - 1, p.day)).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
    const month = new Date(Date.UTC(p.year, p.month - 1, p.day)).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
    return `${name} ${p.day} ${month}`;
}

/** Time left on a timer: "42:10", or "1:05:00" for an hour or more. */
export function countdownText(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
}

/** A day and time as a label: "Tomorrow 5:49 am", "Sat 24 Oct 8:35 am". */
export function dayTime(ms: number, now: number, zone?: Zone): string {
    return `${dayLabel(ms, now, zone)} ${clockOf(ms, zone)}`;
}

/** A day inside a sentence: "today", "tomorrow", "Sat 24 Oct" (use with "at": "tomorrow at 5:49 am"). */
export function dayInSentence(ms: number, now: number, zone?: Zone): string {
    const label = dayLabel(ms, now, zone);
    return label === 'Today' || label === 'Tomorrow' ? label.toLowerCase() : label;
}

/** A calendar date for the log: "Sat 24 Oct", with the year if it is not this year. */
export function shortDate(ms: number, now: number, zone?: Zone): string {
    const p = partsOf(ms, zone);
    const base = `${weekdayOf(ms, zone)} ${p.day} ${MONTHS[p.month - 1]}`;
    return p.year === partsOf(now, zone).year ? base : `${base} ${p.year}`;
}
