import { DEFAULT_HYDRATION, HYDRATIONS, LOAF_SIZES, type LoafSize } from '../domain/recipe';
import {
    COOLING_CHOICES, COOLEST_TEMP, WAIT_MAX_HOURS, WAIT_MIN_HOURS, FRIDGE_MAX_HOURS, FRIDGE_MIN_HOURS, WARMEST_TEMP, bulkFor, isQuickFeed, ratioFor,
    buildPlan, feedForWait, nudgeFridge, waitHoursOf, type Levers as LeverSet, type Zone
} from '../domain/plan';
import { QUICK_FEED_NUDGE_AT } from '../domain/bakeLog';
import { lengthOf, whenOf } from './format';
import { LEVER_HELP } from '../domain/tips';

interface Props {
    levers: LeverSet;
    zone?: Zone;
    onChange: (next: LeverSet) => void;
    /** How many bakes in a row used a quick feed (from the log). */
    quickStreak?: number;
    /** Levers that have already happened cannot change. */
    locked?: { feedRatio?: boolean; doughTemp?: boolean; fridge?: boolean };
    /** The shortest wait before adding the starter (minutes after it is ready), for a starter already fed. */
    minDelayMin?: number;
    /** Show only one group of levers: those that move the timeline, the cooling, or your loaf. All of them if not set. */
    part?: 'timing' | 'cooling' | 'loaf';
}

const hoursText = (h: number) => lengthOf(h * 3_600_000);

/** The things you can change, and what each does to your day. */
export function Levers({ levers, zone, onChange, quickStreak = 0, locked = {}, minDelayMin = 0, part }: Props) {
    const set = (over: Partial<LeverSet>) => onChange({ ...levers, ...over });
    const ratio = ratioFor(levers.ratioN);
    const bulk = bulkFor(levers.doughTemp);
    const wait = waitHoursOf(levers);
    const plan = buildPlan(levers);
    const fridgeHours = levers.fridge.kind === 'hours' ? levers.fridge.hours : null;
    const nudge = nudgeFridge(levers, zone);
    const nudgeNeeded = nudge !== null && fridgeHours !== null && Math.abs(nudge - fridgeHours) > 1e-6;

    return (
        <section class="levers" aria-label={part === 'timing' ? 'Timing levers' : part === 'cooling' ? 'Cooling' : part === 'loaf' ? 'Your loaf' : 'Levers'}>
            {(!part || part === 'timing') && (<>
            <div class="lever">
                <div class="lever-head"><label for="lv-feed">Starter feeding time</label></div>
                <p class="hint lever-help">{LEVER_HELP.ratio}</p>
                <input id="lv-feed" type="range" step={0.25} aria-valuetext={`${hoursText(wait)} after feeding, a ${ratio.ratio} feed`}
                    min={locked.feedRatio ? ratio.minHours + minDelayMin / 60 : WAIT_MIN_HOURS} max={locked.feedRatio ? ratio.maxHours : WAIT_MAX_HOURS} value={wait}
                    onInput={(e) => {
                        const h = Number((e.target as HTMLInputElement).value);
                        set(locked.feedRatio ? { starterDelayMin: Math.round((h - ratio.minHours) * 60) } : feedForWait(h));
                    }} />
                <output>{ratio.ratio} feed, starter added {hoursText(wait)} after feeding</output>
                <p class="hint">
                    Starter ready from {whenOf(plan.starterReadyAt, zone)}. Autolyse at {whenOf(plan.byId.autolyse, zone)}, add the starter at {whenOf(plan.byId.starterIn, zone)}.
                </p>
                {isQuickFeed(levers.ratioN) && (
                    <p class="hint warn">Quick feeds are fine now and then to hurry a bake. For a starter you keep in the fridge, a steadier 1:6:6 is gentler.{quickStreak >= QUICK_FEED_NUDGE_AT && ` Your last ${quickStreak} bakes all used quick feeds, so this might be a good time for a steady one.`}</p>
                )}
            </div>

            <div class="lever">
                <div class="lever-head"><label for="lv-temp">Dough temperature</label></div>
                <p class="hint lever-help">{LEVER_HELP.doughTemp}</p>
                <input id="lv-temp" type="range" min={COOLEST_TEMP} max={WARMEST_TEMP} step={0.5} value={levers.doughTemp} disabled={locked.doughTemp}
                    onInput={(e) => set({ doughTemp: Number((e.target as HTMLInputElement).value) })} />
                <output>{levers.doughTemp}°C: bulk takes about {hoursText(bulk.hours)}</output>
            </div>

            <div class="lever">
                <div class="lever-head"><label for="lv-fridge">Time in the fridge</label></div>
                <p class="hint lever-help">{LEVER_HELP.retardation}</p>
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

            </>)}
            {(!part || part === 'cooling') && (<>
            <div class="lever">
                <div class="lever-head"><span class="label" id="lv-cool">Cooling before carving</span></div>
                <p class="hint lever-help">{LEVER_HELP.cooling}</p>
                <div class="seg-choice" role="group" aria-labelledby="lv-cool">
                    {COOLING_CHOICES.map((c) => (
                        <button type="button" class={levers.cooling === c ? 'on' : ''} aria-pressed={levers.cooling === c} onClick={() => set({ cooling: c })}>{c} min</button>
                    ))}
                </div>
            </div>

            </>)}
            {(!part || part === 'loaf') && (<>
            <div class="lever">
                <div class="lever-head"><span class="label" id="lv-loaf">Your loaf</span></div>
                <p class="hint lever-help">{LEVER_HELP.loaf}</p>
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
                <p class="hint">{LOAF_SIZES[levers.size].note}.</p>
                <div class="lever-head spaced"><label for="lv-hydration" class="sub">Hydration</label></div>
                <p class="hint lever-help">{LEVER_HELP.hydration}</p>
                <select id="lv-hydration" value={levers.hydration ?? DEFAULT_HYDRATION} onChange={(e) => set({ hydration: Number((e.target as HTMLSelectElement).value) })}>
                    {HYDRATIONS.map((h) => <option value={h}>{h}%</option>)}
                </select>
            </div>
            </>)}
        </section>
    );
}
