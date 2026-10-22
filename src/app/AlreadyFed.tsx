import { useMemo, useState } from 'preact/hooks';
import { FEEDING_RATIOS } from '../domain/feeding';
import {
    addLocalDays, atLocalTime, buildPlan, fedActuals, fedLevers, leversAt, minDelayFor, minutesOfDay, starterState, startOfLocalDay,
    type Actuals, type Levers as LeverSet, type Zone
} from '../domain/plan';
import { PlanDetail } from './PlanDetail';
import { clockOf, dayLabel } from './format';

interface Props {
    now: number;
    zone?: Zone;
    onStart?: (levers: LeverSet, actuals: Actuals) => void;
    quickStreak?: number;
}

interface Fed { dayBack: 0 | 1; min: number; ratioN: number }

const DEFAULT_FED: Fed = { dayBack: 1, min: 20 * 60, ratioN: 6 };
const pad = (n: number) => String(n).padStart(2, '0');

const fedAtOf = (f: Fed, now: number, zone?: Zone) => atLocalTime(addLocalDays(startOfLocalDay(now, zone), -f.dayBack, zone), f.min, zone);

function startingLevers(f: Fed, now: number, zone?: Zone): LeverSet {
    const fedAt = fedAtOf(f, now, zone);
    return fedLevers(fedAt, f.ratioN, now, {}, zone)
        ?? leversAt(fedAt, { ratioN: f.ratioN, starterDelayMin: minDelayFor(fedAt, f.ratioN, leversAt(0).autolyseMin, now) });
}

/** "I have already fed my starter": say when and how, then plan the rest of the bake from there. */
export function AlreadyFed({ now, zone, onStart, quickStreak }: Props) {
    const [fed, setFed] = useState<Fed>(DEFAULT_FED);
    const [levers, setLevers] = useState<LeverSet>(() => startingLevers(DEFAULT_FED, now, zone));
    const fedAt = fedAtOf(fed, now, zone);
    const future = fedAt > now;
    const state = starterState(fedAt, fed.ratioN, now);
    const plan = useMemo(() => buildPlan(levers, fedActuals(fedAt)), [levers, fedAt]);

    const change = (patch: Partial<Fed>) => {
        const next = { ...fed, ...patch };
        setFed(next);
        setLevers(startingLevers(next, now, zone));
    };
    const timeValue = `${pad(Math.floor(fed.min / 60))}:${pad(fed.min % 60)}`;

    return (
        <div class="already-fed">
            <section class="panel" aria-label="Your feed">
                <h2>When did you feed your starter?</h2>
                <div class="chips" role="group" aria-label="Day">
                    {([[1, 'Yesterday'], [0, 'Today']] as const).map(([d, label]) => (
                        <button type="button" class={`chip${fed.dayBack === d ? ' on' : ''}`} aria-pressed={fed.dayBack === d} onClick={() => change({ dayBack: d })}>{label}</button>
                    ))}
                </div>
                <div class="lever">
                    <label for="fed-time">Time</label>
                    <input id="fed-time" type="time" value={timeValue}
                        onChange={(e) => {
                            const [h, m] = (e.target as HTMLInputElement).value.split(':').map(Number);
                            if (Number.isFinite(h) && Number.isFinite(m)) change({ min: h! * 60 + m! });
                        }} />
                </div>
                <div class="lever">
                    <label for="fed-ratio">Feed</label>
                    <select id="fed-ratio" value={fed.ratioN} onChange={(e) => change({ ratioN: Number((e.target as HTMLSelectElement).value) })}>
                        {FEEDING_RATIOS.map((r) => {
                            const n = Number(r.ratio.split(':')[1]);
                            return <option value={n}>{r.ratio}, ready in {r.minHours} to {r.maxHours} h</option>;
                        })}
                    </select>
                </div>
            </section>

            {future ? (
                <p class="problems" role="status">That time has not happened yet. Pick an earlier time, or plan a loaf from now instead.</p>
            ) : (
                <>
                    <section class="panel result" aria-live="polite">
                        <p class="eyebrow">Your starter</p>
                        <p class="big">
                            {state === 'rising' && `Ready ${dayLabel(plan.starterReadyAt, now, zone)} at ${clockOf(plan.starterReadyAt, zone)}`}
                            {state === 'ready' && 'Ready now'}
                            {state === 'past' && 'Past its best'}
                        </p>
                        <p class="hint">
                            {state === 'past'
                                ? `It was at its best until ${dayLabel(plan.starterStaleAt, now, zone)} at ${clockOf(plan.starterStaleAt, zone)}. It will still raise a loaf but more slowly, or you could feed it again.`
                                : `Best used by ${dayLabel(plan.starterStaleAt, now, zone)} at ${clockOf(plan.starterStaleAt, zone)}.`}
                        </p>
                        <p class="hint">Ready to carve {dayLabel(plan.readyToCarve, now, zone)} at {clockOf(plan.readyToCarve, zone)}.</p>
                    </section>
                    <PlanDetail
                        levers={levers} onChange={setLevers} now={now} zone={zone} quickStreak={quickStreak}
                        fed={{ minDelayMin: minDelayFor(fedAt, fed.ratioN, levers.autolyseMin, now) }}
                        onStart={onStart && ((l) => onStart(l, fedActuals(fedAt)))}
                    />
                </>
            )}
        </div>
    );
}
