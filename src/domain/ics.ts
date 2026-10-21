// A calendar file (.ics) with one event per step, each with an alert before it, so your
// phone's own calendar can remind you even when this app is closed.
import { MINUTE, type Plan, type StepId } from './plan';

/** How long before each step the alert goes off. */
export const ALERT_MINUTES = 10;
const EVENT_MINUTES = 15;

const utc = (ms: number): string => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const escape = (t: string): string => t.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** Lines longer than 75 characters are folded onto the next line, as the format requires. */
function fold(line: string): string {
    const out: string[] = [];
    let rest = line;
    while (rest.length > 75) { out.push(rest.slice(0, 75)); rest = ` ${rest.slice(75)}`; }
    out.push(rest);
    return out.join('\r\n');
}

export interface IcsOptions {
    /** Steps you have already done are left out. */
    done?: readonly StepId[];
    /** Steps before this moment are left out. */
    after?: number;
    /** When the file is made. Also sets the version, so an updated file replaces the earlier events. */
    now: number;
}

export function planToIcs(plan: Plan, opts: IcsOptions): string {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', "PRODID:-//Loaf O'Clock//fj9//EN", 'CALSCALE:GREGORIAN'];
    const skip = new Set(opts.done ?? []);
    for (const s of plan.steps) {
        if (skip.has(s.id) || (opts.after !== undefined && s.at < opts.after)) continue;
        lines.push(
            'BEGIN:VEVENT',
            `UID:loafoclock-${plan.byId.feed}-${s.id}@fj9.github.io`,
            `SEQUENCE:${Math.floor(opts.now / MINUTE)}`,
            `DTSTAMP:${utc(opts.now)}`,
            `DTSTART:${utc(s.at)}`,
            `DTEND:${utc(s.at + EVENT_MINUTES * MINUTE)}`,
            `SUMMARY:${escape(`Loaf O'Clock: ${s.label}`)}`,
            'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escape(s.label)}`, `TRIGGER:-PT${ALERT_MINUTES}M`, 'END:VALARM',
            'END:VEVENT'
        );
    }
    lines.push('END:VCALENDAR');
    return `${lines.map(fold).join('\r\n')}\r\n`;
}
