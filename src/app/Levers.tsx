import { FEEDING_RATIOS } from '../domain/feeding';
import { DEFAULT_HYDRATION, HYDRATIONS, LOAF_SIZES, type LoafSize } from '../domain/recipe';
import {
    COOLING_CHOICES, COOLEST_TEMP, FRIDGE_MAX_HOURS, FRIDGE_MIN_HOURS, WARMEST_TEMP, bulkFor, isQuickFeed, ratioFor,
    nudgeFridge, type Levers as LeverSet, type Zone
} from '../domain/plan';
import { lengthOf } from './format';

interface Props {
    levers: LeverSet;
    zone?: Zone;
    onChange: (next: LeverSet) => void;
    /** Levers that have already happened cannot change. */
    locked?: { feedRatio?: boolean; doughTemp?: boolean; fridge?: boolean };
}

const hoursText = (h: number) => lengthOf(h * 3_600_000);

/** The things you can change, and what each does to your day. */
export function Levers({ levers, zone, onChange, locked = {} }: Props) {
    const set = (over: Partial<LeverSet>) => onChange({ ...levers, ...over });
    const ratio = ratioFor(levers.ratioN);
    const bulk = bulkFor(levers.doughTemp);
    const widthMin = (ratio.maxHours - ratio.minHours) * 60;
    const fridgeHours = levers.fridge.kind === 'hours' ? levers.fridge.hours : null;
    const nudge = nudgeFridge(levers, zone);
    const nudgeNeeded = nudge !== null && fridgeHours !== null && Math.abs(nudge - fridgeHours) > 1e-6;

    return (
        <section class="levers" aria-label="Levers">
            <div class="lever">
                <span class="label" id="lv-loaf">Your loaf</span>
                <div class="seg-choice" role="group" aria-labelledby="lv-loaf">
                    {([1, 2] as const).map((n) => (
                        <button type="button" class={(levers.loaves ?? 1) === n ? 'on' : ''} aria-pressed={(levers.loaves ?? 1) === n} onClick={() => set({ loaves: n })}>
                            {n} {n === 1 ? 'loaf' : 'loaves'}
                        </button>
                    ))}
                </div>
                <div class="seg-choice" role="group" aria-label="Loaf size">
                    {(Object.keys(LOAF_SIZES) as LoafSize[]).map((k) => (
                        <button type="button" class={levers.size === k ? 'on' : ''} aria-pressed={levers.size === k} onClick={() => set({ size: k })}>
                            {LOAF_SIZES[k].label}
                        </button>
                    ))}
                </div>
                <label for="lv-hydration" class="sub">Hydration</label>
                <select id="lv-hydration" value={levers.hydration ?? DEFAULT_HYDRATION} onChange={(e) => set({ hydration: Number((e.target as HTMLSelectElement).value) })}>
                    {HYDRATIONS.map((h) => <option value={h}>{h}%</option>)}
                </select>
                <p class="hint">{LOAF_SIZES[levers.size].note}. Only the amounts change, apart from a larger loaf baking a little longer.</p>
            </div>

            <div class="lever">
                <label for="lv-ratio">Feed</label>
                <select id="lv-ratio" value={levers.ratioN} disabled={locked.feedRatio}
                    onChange={(e) => set({ ratioN: Number((e.target as HTMLSelectElement).value), starterDelayMin: 0 })}>
                    {FEEDING_RATIOS.map((r) => {
                        const n = Number(r.ratio.split(':')[1]);
                        return <option value={n}>{r.ratio}, ready in {r.minHours} to {r.maxHours} h{isQuickFeed(n) ? ' (quick)' : ''}</option>;
                    })}
                </select>
                {isQuickFeed(levers.ratioN) && (
                    <p class="hint warn">Quick feeds are fine now and then to hurry a bake. For a starter you keep in the fridge, a steadier 1:6:6 is gentler.</p>
                )}
            </div>

            {widthMin > 0 && (
                <div class="lever">
                    <label for="lv-wait">Wait before adding the starter</label>
                    <input id="lv-wait" type="range" min={0} max={widthMin} step={15} value={levers.starterDelayMin}
                        onInput={(e) => set({ starterDelayMin: Number((e.target as HTMLInputElement).value) })} />
                    <output>{levers.starterDelayMin ? `${lengthOf(levers.starterDelayMin * 60_000)} after it is ready` : 'As soon as it is ready'}</output>
                </div>
            )}

            <div class="lever">
                <label for="lv-temp">Dough temperature</label>
                <input id="lv-temp" type="range" min={COOLEST_TEMP} max={WARMEST_TEMP} step={0.5} value={levers.doughTemp} disabled={locked.doughTemp}
                    onInput={(e) => set({ doughTemp: Number((e.target as HTMLInputElement).value) })} />
                <output>{levers.doughTemp}°C: bulk takes about {hoursText(bulk.hours)}</output>
            </div>

            <div class="lever">
                <label for="lv-fridge">Time in the fridge</label>
                {fridgeHours !== null ? (
                    <>
                        <input id="lv-fridge" type="range" min={FRIDGE_MIN_HOURS} max={FRIDGE_MAX_HOURS} step={0.25} value={fridgeHours} disabled={locked.fridge}
                            onInput={(e) => set({ fridge: { kind: 'hours', hours: Number((e.target as HTMLInputElement).value) } })} />
                        <output>{hoursText(fridgeHours)}</output>
                        {nudgeNeeded && (
                            <p class="hint warn">
                                That puts the oven or the bake in your sleeping hours.{' '}
                                <button type="button" class="link" onClick={() => set({ fridge: { kind: 'hours', hours: nudge! } })}>
                                    Use {hoursText(nudge!)} instead
                                </button>
                            </p>
                        )}
                        {!locked.fridge && (
                            <p class="hint">
                                <button type="button" class="link" onClick={() => set({ fridge: { kind: 'none' } })}>Skip the fridge</button>
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <p id="lv-fridge" class="hint">No fridge: shape, then bake after about 2 to 3 hours. It saves a lot of time but makes a less sourdough loaf.</p>
                        <button type="button" class="link" onClick={() => set({ fridge: { kind: 'hours', hours: FRIDGE_MIN_HOURS } })}>Use the fridge again</button>
                    </>
                )}
            </div>

            <div class="lever">
                <span class="label" id="lv-cool">Cooling before carving</span>
                <div class="seg-choice" role="group" aria-labelledby="lv-cool">
                    {COOLING_CHOICES.map((c) => (
                        <button type="button" class={levers.cooling === c ? 'on' : ''} aria-pressed={levers.cooling === c} onClick={() => set({ cooling: c })}>{c} min</button>
                    ))}
                </div>
            </div>
        </section>
    );
}
