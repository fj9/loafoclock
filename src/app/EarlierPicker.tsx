import { useState } from 'preact/hooks';
import { MINUTE, addLocalDays, atLocalTime, partsOf, type Zone } from '../domain/plan';
import { TimeField } from './TimeField';
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

    /** A time picked on the same day, or the day before if that would be in the future (just after midnight). */
    const picked = (minutes: number) => {
        const t = atLocalTime(ms, minutes, zone);
        setMs(t > now + MINUTE ? addLocalDays(t, -1, zone) : t);
    };

    return (
        <div class="earlier" role="group" aria-label={label} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}>
            <p class="hint">When did you do this?</p>
            <div class="stepper">
                <button type="button" class="btn outline" aria-label="5 minutes earlier" onClick={() => setMs(ms - STEP)}>−5</button>
                <TimeField label="Time" minutes={p.hour * 60 + p.minute} onChange={picked} />
                <button type="button" class="btn outline" aria-label="5 minutes later" disabled={ms + STEP > now} onClick={() => setMs(ms + STEP)}>+5</button>
            </div>
            <div class="btn-row">
                <button type="button" class="btn outline" onClick={onCancel}>Cancel</button>
                <button type="button" class="btn" onClick={() => onSave(ms)}>Save {clockOf(ms, zone)}</button>
            </div>
        </div>
    );
}
