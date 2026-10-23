import { useState } from 'preact/hooks';
import { MINUTE, partsOf, type Zone } from '../domain/plan';
import { clockOf, dayLabel, lengthOf } from './format';
import { timeOnDayOf, touchScreen } from './timePicking';

export interface Chip { label: string; at: number }
export interface Nudge { label: string; spoken: string; by: number }

interface Props {
    /** The time picked now. */
    value: number;
    now: number;
    zone?: Zone;
    onChange: (at: number) => void;
    /** Quick answers, already limited to those that make sense. */
    chips: readonly Chip[];
    /** Buttons that move the time, shown on a computer. */
    nudges: readonly Nudge[];
    /** A nudge cannot go before this, and says why with `earliestMessage`. */
    earliest: number;
    earliestMessage: string;
    /** A time chosen on the phone's wheel lands on the day of this moment, or the day before if that has not come yet. */
    wheelDayOf: number;
    /** Say "Today" in the summary too. Without it only another day is named. */
    showToday?: boolean;
    /** Names the quick answers for screen readers. */
    chipsLabel: string;
    /** Names the wheel for screen readers. */
    wheelLabel: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Quick answers first, then an exact time when you need one: a summary of the time picked and an Adjust button.
 * A phone opens its own time wheel; a computer gets buttons that move the time. It never goes into the future.
 * The caller decides what the quick answers and the buttons are, and how far back it can go.
 */
export function QuickTimePicker({ value, now, zone, onChange, chips, nudges, earliest, earliestMessage, wheelDayOf, showToday = true, chipsLabel, wheelLabel }: Props) {
    const [open, setOpen] = useState(false);
    const [problem, setProblem] = useState('');
    const set = (at: number) => { setProblem(''); onChange(at); };

    const nudge = (by: number) => {
        const next = value + by;
        if (next > now) return setProblem('That has not happened yet.');
        if (next < earliest) return setProblem(earliestMessage);
        set(next);
    };

    const fromWheel = (text: string) => {
        const [h, m] = text.split(':').map(Number);
        if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return;
        set(timeOnDayOf(wheelDayOf, h * 60 + m, now, zone));
    };

    const day = dayLabel(value, now, zone);
    const ago = now - value < MINUTE ? 'just now' : `${lengthOf(now - value)} ago`;
    const p = partsOf(value, zone);

    return (
        <div class="quick-time">
            <div class="chips" role="group" aria-label={chipsLabel}>
                {chips.map((c) => (
                    <button type="button" class={`chip${value === c.at ? ' on' : ''}`} aria-pressed={value === c.at} onClick={() => set(c.at)}>{c.label}</button>
                ))}
            </div>
            <div class="qt-sum" role="status">
                <span>
                    <strong>{showToday || day !== 'Today' ? `${day} ` : ''}{clockOf(value, zone)}</strong>
                    <span class="hint">{ago}</span>
                </span>
                <button type="button" class="btn outline small" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Close' : 'Adjust'}</button>
            </div>
            {open && (touchScreen() ? (
                <div class="qt-adjust">
                    <label for="qt-wheel" class="sr-only">{wheelLabel}</label>
                    <input id="qt-wheel" type="time" class="qt-wheel" value={`${pad(p.hour)}:${pad(p.minute)}`} onChange={(e) => fromWheel((e.target as HTMLInputElement).value)} />
                    <p class="hint">Today, or yesterday if that time has not come yet today.</p>
                </div>
            ) : (
                <div class="qt-adjust">
                    <div class="qt-nudges" style={`--n:${nudges.length}`}>
                        {nudges.map((n) => <button type="button" class="btn outline" aria-label={n.spoken} onClick={() => nudge(n.by)}>{n.label}</button>)}
                    </div>
                </div>
            ))}
            {problem && <p class="qt-problem" role="alert">{problem}</p>}
        </div>
    );
}
