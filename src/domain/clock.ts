// How times are written on screen: "7:30 am" (the default in the app) or "07:30".
// Everything stored and calculated stays 24-hour "HH:MM"; only the display changes.
let use12 = false; // the app switches this on at start-up from the Settings choice

export function setClock12(on: boolean): void {
    use12 = Boolean(on);
}
export function isClock12(): boolean {
    return use12;
}

const split = (hhmm: string): [number, number] => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    return [h, m];
};
const pad = (n: number): string => String(n).padStart(2, '0');

/** "19:30" -> "7:30 pm" or "19:30" */
export function fmtTime(hhmm: string): string {
    if (!hhmm) return '';
    if (!use12) return hhmm;
    const [h, m] = split(hhmm);
    return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? 'pm' : 'am'}`;
}

/** Shorter, for buttons: "7 am", "7:30 pm", or "07:00" */
export function fmtShort(hhmm: string): string {
    if (!use12) return hhmm;
    const [h, m] = split(hhmm);
    return `${h % 12 || 12}${m ? `:${pad(m)}` : ''} ${h >= 12 ? 'pm' : 'am'}`;
}
