import { useState } from 'preact/hooks';
import { HOUR, addLocalDays, atLocalTime, partsOf, startOfLocalDay, type Zone } from '../domain/plan';
import { clockOf, dayLabel, lengthOf } from './format';

interface Props {
    /** When the starter was fed. */
    fedAt: number;
    now: number;
    zone?: Zone;
    onChange: (fedAt: number) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const NUDGES: ReadonlyArray<[label: string, spoken: string, by: number]> = [
    ['−1 h', 'One hour earlier', -HOUR], ['−15 min', '15 minutes earlier', -15 * 60_000],
    ['+15 min', '15 minutes later', 15 * 60_000], ['+1 h', 'One hour later', HOUR]
];

/** True on a phone or tablet, where the system's own time wheel is the best way to pick an exact time. */
const touchScreen = () => typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(pointer: coarse)').matches;

/**
 * "When did you feed your starter?": quick answers first, and an exact time when you need one. A phone opens
 * its own time wheel; a computer gets buttons that move the time by 15 minutes or an hour. You can go back
 * to the start of yesterday, and not into the future.
 */
export function FedTimePicker({ fedAt, now, zone, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const [problem, setProblem] = useState('');

    const today = startOfLocalDay(now, zone);
    const yesterday = addLocalDays(today, -1, zone);
    const set = (at: number) => { setProblem(''); onChange(at); };

    // Quick answers, kept to those that make sense now (and not twice).
    const chips = [
        { label: 'Just now', at: now }, { label: '1 h ago', at: now - HOUR }, { label: '2 h ago', at: now - 2 * HOUR },
        { label: '4 h ago', at: now - 4 * HOUR }, { label: 'Last night, 8 pm', at: atLocalTime(yesterday, 20 * 60, zone) }
    ].filter((c, i, all) => c.at >= yesterday && c.at <= now && all.findIndex((o) => o.at === c.at) === i);

    const nudge = (by: number) => {
        const next = fedAt + by;
        if (next > now) return setProblem('That has not happened yet.');
        if (next < yesterday) return setProblem('You can go back to the start of yesterday.');
        set(next);
    };

    // A time of day from the phone's wheel means the latest time that matches: today, or yesterday if it is still to come.
    const fromWheel = (value: string) => {
        const [h, m] = value.split(':').map(Number);
        if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return;
        const minutes = h * 60 + m;
        const todayAt = atLocalTime(today, minutes, zone);
        set(todayAt <= now ? todayAt : atLocalTime(yesterday, minutes, zone));
    };

    const ago = now - fedAt < 60_000 ? 'just now' : `${lengthOf(now - fedAt)} ago`;
    const p = partsOf(fedAt, zone);

    return (
        <div class="fed-picker">
            <div class="chips" role="group" aria-label="When you fed it">
                {chips.map((c) => (
                    <button type="button" class={`chip${fedAt === c.at ? ' on' : ''}`} aria-pressed={fedAt === c.at} onClick={() => { set(c.at); }}>{c.label}</button>
                ))}
            </div>
            <div class="fp-sum" role="status">
                <span>
                    <strong>{dayLabel(fedAt, now, zone)} {clockOf(fedAt, zone)}</strong>
                    <span class="hint">{ago}</span>
                </span>
                <button type="button" class="btn outline small" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Done' : 'Adjust'}</button>
            </div>
            {open && (touchScreen() ? (
                <div class="fp-adjust">
                    <label for="fed-wheel" class="sr-only">Time you fed your starter</label>
                    <input id="fed-wheel" type="time" class="fp-wheel" value={`${pad(p.hour)}:${pad(p.minute)}`} onChange={(e) => fromWheel((e.target as HTMLInputElement).value)} />
                    <p class="hint">Today, or yesterday if that time has not come yet today.</p>
                </div>
            ) : (
                <div class="fp-adjust">
                    <div class="fp-nudges">
                        {NUDGES.map(([label, spoken, by]) => (
                            <button type="button" class="btn outline" aria-label={spoken} onClick={() => nudge(by)}>{label}</button>
                        ))}
                    </div>
                </div>
            ))}
            <p class="fp-problem" role="alert">{problem}</p>
        </div>
    );
}
