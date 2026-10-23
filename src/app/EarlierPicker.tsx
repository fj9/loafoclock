import { useState } from 'preact/hooks';
import { MINUTE, partsOf, type Zone } from '../domain/plan';
import { QuickTimePicker, type Nudge } from './QuickTimePicker';
import { clockOf } from './format';
import { floorMinute } from './timePicking';

interface Props {
    /** The current time: a step cannot be done in the future. */
    now: number;
    zone?: Zone;
    /** The time to start from (now, or the time already recorded). */
    start: number;
    /** The earliest it can be: the step before it, if that is done. */
    notBefore?: number;
    /** Names the group for screen readers. */
    label: string;
    onSave: (ms: number) => void;
    onCancel: () => void;
}

const NUDGES: readonly Nudge[] = [
    { label: '−5 min', spoken: '5 minutes earlier', by: -5 * MINUTE }, { label: '−1 min', spoken: 'A minute earlier', by: -MINUTE },
    { label: '+1 min', spoken: 'A minute later', by: MINUTE }, { label: '+5 min', spoken: '5 minutes later', by: 5 * MINUTE }
];
// No "Just now": the picker opens at the current time, and Done and Save already mean that.
const AGO: ReadonlyArray<[label: string, minutes: number]> = [['5 min ago', 5], ['10 min ago', 10], ['30 min ago', 30], ['1 h ago', 60]];

/** "When did you do this?": a quick answer, or an exact time on request, then save. */
export function EarlierPicker({ now, zone, start, notBefore = -Infinity, label, onSave, onCancel }: Props) {
    const [ms, setMs] = useState(Math.max(Math.min(floorMinute(start), floorMinute(now)), floorMinute(notBefore)));
    const earliest = floorMinute(notBefore);
    // Moving freely is fine on the wheel, but it cannot be saved from before the step ahead of it.
    const tooEarly = ms < earliest;
    // With no step before it there is no limit, so there is nothing to say.
    const limit = Number.isFinite(notBefore) ? `It can't be before ${clockOf(notBefore, zone)}, when the step before it was done.` : '';
    const chips = AGO.map(([text, minutes]) => ({ label: text, at: floorMinute(now) - minutes * MINUTE }))
        .filter((c) => c.at >= earliest);

    return (
        <div class="earlier" role="group" aria-label={label} onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}>
            <p class="hint">When did you do this?</p>
            <QuickTimePicker
                value={ms} now={now} zone={zone} onChange={setMs} chips={chips} nudges={NUDGES}
                earliest={earliest} earliestMessage={limit}
                wheelDayOf={ms} showToday={false} chipsLabel="When you did it" wheelLabel="Time you did this"
            />
            {tooEarly && <p class="hint warn" role="alert">{limit}</p>}
            <div class="btn-row">
                <button type="button" class="btn outline" onClick={onCancel}>Cancel</button>
                <button type="button" class="btn" disabled={tooEarly} onClick={() => onSave(ms)}>Save {clockOf(ms, zone)}</button>
            </div>
        </div>
    );
}
