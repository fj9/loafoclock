import { useState } from 'preact/hooks';
import { MINUTE, addLocalDays, atLocalTime, partsOf, type Zone } from '../domain/plan';
import { clockOf } from './format';

interface Props {
    /** The current time: a step cannot be done in the future. */
    now: number;
    zone?: Zone;
    /** The time to start from (now, or the time already recorded). */
    start: number;
    /** Names the group for screen readers. */
    label: string;
    onSave: (ms: number) => void;
    onCancel: () => void;
}

const STEP = 5 * MINUTE;
const floorMinute = (ms: number) => Math.floor(ms / MINUTE) * MINUTE;

/** "When did you do this?": step back or forward in 5 minutes, or type a time, then save. */
export function EarlierPicker({ now, zone, start, label, onSave, onCancel }: Props) {
    const [ms, setMs] = useState(Math.min(floorMinute(start), floorMinute(now)));
    const p = partsOf(ms, zone);
    const value = `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;

    /** A typed clock time on the same day, or the day before if that would be in the future. */
    const typed = (v: string) => {
        const [h, m] = v.split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return;
        const t = atLocalTime(ms, h! * 60 + m!, zone);
        setMs(t > now + MINUTE ? addLocalDays(t, -1, zone) : t);
    };

    return (
        <div class="earlier" role="group" aria-label={label} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}>
            <p class="hint">When did you do this?</p>
            <div class="stepper">
                <button type="button" class="btn outline" aria-label="5 minutes earlier" onClick={() => setMs(ms - STEP)}>−5</button>
                <input type="time" aria-label="Time" required value={value} onInput={(e) => typed((e.target as HTMLInputElement).value)} />
                <button type="button" class="btn outline" aria-label="5 minutes later" disabled={ms + STEP > now} onClick={() => setMs(ms + STEP)}>+5</button>
            </div>
            <div class="btn-row">
                <button type="button" class="link" onClick={onCancel}>Cancel</button>
                <button type="button" class="btn" onClick={() => onSave(ms)}>Save {clockOf(ms, zone)}</button>
            </div>
        </div>
    );
}
