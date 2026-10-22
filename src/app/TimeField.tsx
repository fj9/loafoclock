import { isClock12 } from '../domain/clock';

interface Props {
    id?: string;
    /** Names the field for screen readers. */
    label: string;
    /** Minutes since midnight, 0 to 1439. */
    minutes: number;
    onChange: (minutes: number) => void;
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * A time of day that follows the Clock setting: hour, minute and am/pm in 12-hour mode, or hour
 * and minute in 24-hour mode. The phone's own time box would use the phone's format instead.
 */
export function TimeField({ id, label, minutes, onChange }: Props) {
    const twelve = isClock12();
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const pm = h24 >= 12;
    const h12 = h24 % 12 || 12;

    const setHour = (v: number) => onChange((twelve ? (v % 12) + (pm ? 12 : 0) : v) * 60 + m);
    const setMinute = (v: number) => onChange(h24 * 60 + v);
    const setPm = (isPm: boolean) => onChange(((h12 % 12) + (isPm ? 12 : 0)) * 60 + m);

    return (
        <div class="time-field" role="group" aria-label={label} id={id}>
            <select aria-label="Hour" value={twelve ? h12 : h24} onChange={(e) => setHour(Number((e.target as HTMLSelectElement).value))}>
                {(twelve ? range(1, 12) : range(0, 23)).map((h) => <option value={h}>{twelve ? h : pad(h)}</option>)}
            </select>
            <span aria-hidden="true">:</span>
            <select aria-label="Minute" value={m} onChange={(e) => setMinute(Number((e.target as HTMLSelectElement).value))}>
                {range(0, 59).map((x) => <option value={x}>{pad(x)}</option>)}
            </select>
            {twelve && (
                <select aria-label="am or pm" value={pm ? 'pm' : 'am'} onChange={(e) => setPm((e.target as HTMLSelectElement).value === 'pm')}>
                    <option value="am">am</option>
                    <option value="pm">pm</option>
                </select>
            )}
        </div>
    );
}
