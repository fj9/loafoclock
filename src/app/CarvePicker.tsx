import { addLocalDays, atLocalTime, minutesOfDay, startOfLocalDay, type Zone } from '../domain/plan';
import { useState } from 'preact/hooks';
import { chipDay, clockOf, fullDay } from './format';

export const MEALS = [
    { label: 'Breakfast', min: 8 * 60 },
    { label: 'Late breakfast', min: 10 * 60 + 30 },
    { label: 'Lunch', min: 12 * 60 + 30 },
    { label: 'Tea', min: 16 * 60 },
    { label: 'Dinner', min: 18 * 60 + 30 },
    { label: 'Supper', min: 20 * 60 + 30 }
] as const;

export const SLIDER_FROM = 6 * 60;
export const SLIDER_TO = 23 * 60 + 30;
const DAYS_SHOWN = 8;

interface Props {
    value: number;
    now: number;
    zone?: Zone;
    onChange: (carveAt: number) => void;
}

/** Pick a day, then a meal or a time, for when you want to carve. */
export function CarvePicker({ value, now, zone, onChange }: Props) {
    const today = startOfLocalDay(now, zone);
    const days = Array.from({ length: DAYS_SHOWN }, (_, i) => addLocalDays(today, i, zone));
    const dayOfValue = startOfLocalDay(value, zone);
    const min = minutesOfDay(value, zone);
    const setDay = (d: number) => onChange(atLocalTime(d, min, zone));
    const setMin = (m: number) => onChange(atLocalTime(dayOfValue, m, zone));
    // While the slider is being dragged only the label moves; the plans are worked out on release.
    const [drag, setDrag] = useState<number | null>(null);
    const shown = drag ?? min;

    return (
        <section class="carve-picker" aria-label="When do you want to carve?">
            <div class="chips" role="group" aria-label="Day">
                {days.map((d) => (
                    <button type="button" class={`chip${d === dayOfValue ? ' on' : ''}`} aria-pressed={d === dayOfValue} onClick={() => setDay(d)}>
                        {chipDay(d, now, zone)}
                    </button>
                ))}
            </div>
            <div class="chips" role="group" aria-label="Meal">
                {MEALS.map((m) => (
                    <button type="button" class={`chip${m.min === min ? ' on' : ''}`} aria-pressed={m.min === min} onClick={() => setMin(m.min)}>
                        {m.label}
                    </button>
                ))}
            </div>
            <div class="lever">
                <label for="carve-time">Time: {clockOf(atLocalTime(dayOfValue, shown, zone), zone)}</label>
                <input id="carve-time" type="range" min={SLIDER_FROM} max={SLIDER_TO} step={15} value={Math.min(Math.max(shown, SLIDER_FROM), SLIDER_TO)}
                    onInput={(e) => setDrag(Number((e.target as HTMLInputElement).value))}
                    onChange={(e) => { setDrag(null); setMin(Number((e.target as HTMLInputElement).value)); }} />
            </div>
            <p class="hint">{fullDay(value, zone)}</p>
        </section>
    );
}
