import { fmtTime } from '../domain/clock';
import { TEXT_SIZES, THEMES, wakingFromSettings, type Settings, type TextSize, type Theme } from '../domain/settings';

interface Props {
    settings: Settings;
    onChange: (patch: Settings) => void;
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const range = (from: number, to: number) => Array.from({ length: (to - from) / 30 + 1 }, (_, i) => from + i * 30);
const UP_FROM = range(5 * 60, 10 * 60);
const IN_BED_BY = range(20 * 60, 23 * 60 + 30);

const THEME_LABEL: Record<Theme, string> = { system: 'Same as my phone', light: 'Light', dark: 'Dark' };
const TEXT_LABEL: Record<TextSize, string> = { normal: 'Normal', large: 'Large', larger: 'Larger' };

export function SettingsScreen({ settings, onChange }: Props) {
    const theme = settings.theme ?? 'system';
    const text = settings.textSize ?? 'normal';
    const clock12 = settings.clock12 !== false;
    const waking = wakingFromSettings(settings);
    const choice = <T extends string>(label: string, id: string, values: readonly T[], names: Record<T, string>, current: T, set: (v: T) => void) => (
        <div class="lever">
            <span class="label" id={id}>{label}</span>
            <div class="seg-choice" role="group" aria-labelledby={id}>
                {values.map((v) => <button type="button" class={current === v ? 'on' : ''} aria-pressed={current === v} onClick={() => set(v)}>{names[v]}</button>)}
            </div>
        </div>
    );
    return (
        <div class="settings levers">
            <h2>Settings</h2>
            {choice('Colours', 'st-theme', THEMES, THEME_LABEL, theme, (v) => onChange({ theme: v }))}
            {choice('Text size', 'st-text', TEXT_SIZES, TEXT_LABEL, text, (v) => onChange({ textSize: v }))}
            {choice('Clock', 'st-clock', ['12', '24'] as const, { '12': '7:30 pm', '24': '19:30' }, clock12 ? '12' : '24', (v) => onChange({ clock12: v === '12' }))}
            <div class="lever">
                <span class="label" id="st-waking">Your waking hours</span>
                <div class="btn-row" role="group" aria-labelledby="st-waking">
                    <label>Up from{' '}
                        <select value={waking.fromMin} onChange={(e) => onChange({ wakeFrom: Number((e.target as HTMLSelectElement).value) })}>
                            {UP_FROM.map((m) => <option value={m}>{fmtTime(hhmm(m))}</option>)}
                        </select>
                    </label>
                    <label>In bed by{' '}
                        <select value={waking.toMin} onChange={(e) => onChange({ wakeTo: Number((e.target as HTMLSelectElement).value) })}>
                            {IN_BED_BY.map((m) => <option value={m}>{fmtTime(hhmm(m))}</option>)}
                        </select>
                    </label>
                </div>
                <p class="hint">Plans keep every step that needs you between {fmtTime(hhmm(waking.fromMin))} and {fmtTime(hhmm(waking.toMin))}. Carving can wait until the morning.</p>
            </div>
        </div>
    );
}
