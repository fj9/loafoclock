import { useEffect, useState } from 'preact/hooks';
import type { LiveRecord } from '../domain/liveStore';
import {
    FOLD_IDS, MINUTE, STEP_ORDER, buildPlan, reconcile, tick, untick, withKeptBakeTime, type LiveStep, type StepId, type Zone
} from '../domain/plan';
import { guideFor } from '../domain/stepGuide';
import { ConfirmSheet } from './ConfirmSheet';
import { EarlierPicker } from './EarlierPicker';
import { Levers } from './Levers';
import { StepDetail } from './StepDetail';
import { Timeline } from './Timeline';
import { clockOf, countdownText, dayTime, lengthOf, signedMin } from './format';

interface Props {
    record: LiveRecord;
    onChange: (next: LiveRecord) => void;
    onFinish: () => void;
    /** Stop without logging. Defaults to finishing. */
    onStop?: () => void;
    /** The current time. Replaced in tests. */
    clock?: () => number;
    zone?: Zone;
}

const Chevron = () => (
    <svg class="chev" width="18" height="18" viewBox="0 0 14 14" aria-hidden="true">
        <path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
);

/** What the button says: "Done", except a fold, where the number matters. */
const doneLabel = (s: LiveStep) => (s.id.startsWith('fold') ? `Done fold ${s.id.slice(4)}` : 'Done');

/** The locked plan: where you are, what is next and how long you are free. */
export function LiveView({ record, onChange, onFinish, onStop = onFinish, clock = Date.now, zone }: Props) {
    const [now, setNow] = useState(clock);
    useEffect(() => {
        const t = setInterval(() => setNow(clock()), 15_000);
        return () => clearInterval(t);
    }, [clock]);

    // Timers count down every second, so a faster clock runs only while one is running.
    const [fast, setFast] = useState(clock);
    const running = Object.keys(record.timers ?? {}).length > 0;
    useEffect(() => {
        if (!running) return;
        setFast(clock());
        const t = setInterval(() => setFast(clock()), 1000);
        return () => clearInterval(t);
    }, [running, clock]);

    // Which step has its time picker open: "earlier" for one not done yet, "change" for one already done.
    const [picker, setPicker] = useState<{ id: StepId; mode: 'earlier' | 'change' } | null>(null);
    const [editing, setEditing] = useState(false);
    // Which steps have their how-to open. The step that is due starts open; the rest start closed.
    const [how, setHow] = useState<Partial<Record<StepId, boolean>>>({});
    const [stopping, setStopping] = useState(false);
    const original = buildPlan(record.original);
    const view = reconcile(original, record.levers, record.actuals, now);
    const { next } = view;

    // Ticking a step closes its panel and, if the step ends in a wait (a rest, a preheat, cooling), starts that timer.
    /**
     * The earliest and latest a step can be recorded: not before the steps ahead of it, and not after
     * the steps behind it, so the times always run in order.
     */
    const bounds = (id: StepId) => {
        const idx = STEP_ORDER.indexOf(id);
        const times = (ids: readonly StepId[]) => ids.map((k) => record.actuals[k]).filter((v): v is number => v !== undefined);
        const earlier = times(STEP_ORDER.slice(0, idx));
        const later = times(STEP_ORDER.slice(idx + 1));
        return { lo: earlier.length ? Math.max(...earlier) : -Infinity, hi: later.length ? Math.min(...later) : Infinity };
    };
    const doTick = (id: StepId, asked: number) => {
        const { lo, hi } = bounds(id);
        const at = Math.min(Math.max(asked, lo), hi);
        setPicker(null);
        setHow((h) => { const { [id]: _closed, ...rest } = h; return rest; });
        const minutes = guideFor(id, view.plan, (ms) => clockOf(ms, zone)).timerMinutes;
        const end = minutes === undefined ? undefined : at + minutes * MINUTE;
        // Doing a step means the waits before it are over, so their timers go. Then this step's own wait starts.
        const kept = Object.fromEntries(Object.entries(record.timers ?? {}).filter(([k]) => STEP_ORDER.indexOf(k as StepId) >= STEP_ORDER.indexOf(id)));
        const timers = end !== undefined && end > clock() ? { ...kept, [id]: end } : kept;
        onChange({ ...record, actuals: tick(record.actuals, id, at), timers });
    };
    const clearTimer = (id: StepId) => { const { [id]: _gone, ...rest } = record.timers ?? {}; onChange({ ...record, timers: rest }); };
    const undo = (id: StepId) => { const { [id]: _gone, ...rest } = record.timers ?? {}; onChange({ ...record, actuals: untick(record.actuals, id), timers: rest }); };
    // Done ticks at once. The clock button beside it is for a step you forgot to tick.
    const press = (s: LiveStep) => doTick(s.id, clock());
    const openPicker = (id: StepId, mode: 'earlier' | 'change') => setPicker(picker?.id === id ? null : { id, mode });
    const when = (ms: number) => dayTime(ms, now, zone);

    const countdown = (ms: number) => (ms >= 0 ? `in ${lengthOf(ms)}` : `${lengthOf(-ms)} late`);
    const kept = view.keepBakeTime;
    const howOpen = (s: LiveStep, isNext: boolean) => how[s.id] ?? (isNext && s.status !== 'upcoming');
    const detail = (s: LiveStep) => <StepDetail id={s.id} plan={view.plan} zone={zone} />;

    return (
        <div class="live">
            <Timeline plan={view.plan} zone={zone} now={now} />

            {running && (
                <section class="panel timers" aria-label="Timers">
                    {(Object.entries(record.timers ?? {}) as [StepId, number][]).map(([id, end]) => {
                        const left = end - fast;
                        const label = view.steps.find((x) => x.id === id)?.label ?? id;
                        return (
                            <p class={`timer-row${left <= 0 ? ' up' : ''}`} role="timer" aria-label={`Timer for ${label}`}>
                                <span class="timer-name">{label}</span>
                                {left > 0
                                    ? <><strong class="timer-time">{countdownText(left)}</strong> <span class="hint">left, until {clockOf(end, zone)}</span></>
                                    : <strong class="timer-time">Time is up</strong>}
                                {' '}<button type="button" class="btn outline small" onClick={() => clearTimer(id)}>{left > 0 ? 'Stop timer' : 'Clear'}</button>
                            </p>
                        );
                    })}
                </section>
            )}

            {next ? (
                <section class={`panel next-up ${next.status}`} aria-label="Next up">
                    <p class="eyebrow">Next up</p>
                    <p class="big">{next.label}</p>
                    <p class="hint">{when(next.at)} · <strong>{countdown(view.untilNext!)}</strong></p>
                    {FOLD_IDS.includes(next.id) && (
                        <ol class="folds" aria-label="Folds">
                            {view.steps.filter((s) => FOLD_IDS.includes(s.id)).map((s) => (
                                <li class={s.status === 'done' ? 'done' : s.id === next.id ? 'now' : ''} aria-label={`Fold ${s.id.slice(4)} ${s.status === 'done' ? 'done' : 'to do'}`} />
                            ))}
                        </ol>
                    )}
                    <button type="button" class="how-toggle" aria-expanded={howOpen(next, true)} aria-controls="next-how" onClick={() => setHow({ ...how, [next.id]: !howOpen(next, true) })}>
                        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                        {howOpen(next, true) ? 'Hide how-to' : 'Show how-to'}
                    </button>
                    {howOpen(next, true) && <div id="next-how">{detail(next)}</div>}
                    <div class="done-row">
                        <button type="button" class="btn big-btn" onClick={() => press(next)}>{doneLabel(next)}</button>
                        <button type="button" class="btn outline clock-btn" aria-label="Done earlier" aria-expanded={picker?.id === next.id} onClick={() => openPicker(next.id, 'earlier')}>
                            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="8.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M11 6.5V11l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                        </button>
                    </div>
                    {picker?.id === next.id && (
                        <EarlierPicker now={Math.min(clock(), bounds(next.id).hi)} notBefore={bounds(next.id).lo} zone={zone} start={clock()} label="Done earlier" onCancel={() => setPicker(null)} onSave={(ms) => doTick(next.id, ms)} />
                    )}
                    {view.freeMs! > 0 && next.status === 'upcoming' && <p class="hint free">You are free for {lengthOf(view.freeMs!)}.</p>}
                </section>
            ) : (
                <section class="panel next-up done" aria-label="Next up">
                    <p class="eyebrow">All done</p>
                    <p class="big">Ready to carve {when(view.plan.readyToCarve)}</p>
                    <p class="hint">Let it cool, then enjoy it.</p>
                    <button type="button" class="btn big-btn" onClick={onFinish}>Finish this bake</button>
                </section>
            )}

            {kept && (() => {
                const late = view.plan.byId.bake > original.byId.bake;
                return (
                    <p class="problems keep" role="status">
                        You are {lengthOf(Math.abs(view.plan.byId.bake - original.byId.bake))} {late ? 'behind' : 'ahead'}.{' '}
                        {kept.possible ? (
                            <>
                                To bake when you planned, {late ? 'cut' : 'extend'} the fridge to {lengthOf(kept.fridgeHours * 3_600_000)}.{' '}
                                <button type="button" class="btn outline" onClick={() => onChange({ ...record, levers: withKeptBakeTime(record.levers, kept) })}>Keep my bake time</button>
                            </>
                        ) : (
                            <>The fridge can not go {late ? 'below 8' : 'above 72'} hours, so the bake moves to {when(view.plan.byId.bake)}.</>
                        )}
                    </p>
                );
            })()}

            <section class="panel steps live-steps">
                <h2>Your progress</h2>
                <ul class="rows">
                    {view.steps.filter((s) => s.id !== 'carve').map((s) => {
                        const isNext = next?.id === s.id;
                        const done = s.status === 'done';
                        const open = !isNext && (how[s.id] ?? false);
                        const text = (
                            <span class="rowtext">
                                <span class="title">{s.label}{!done && s.shiftMin !== 0 && <span class="shift"> {signedMin(s.shiftMin)}</span>}</span>
                                <span class="sub">{done ? `Done ${clockOf(s.actualAt!, zone)}` : when(s.at)}</span>
                            </span>
                        );
                        return (
                            <li class={`${s.status}${isNext ? ' is-next' : ''}`}>
                                {isNext
                                    ? <div class="rowbtn static">{text}<span class="tag">Next up</span></div>
                                    : (
                                        <button type="button" class="rowbtn" aria-expanded={open} aria-controls={`row-${s.id}`} onClick={() => setHow({ ...how, [s.id]: !open })}>
                                            {text}<Chevron />
                                        </button>
                                    )}
                                {open && (
                                    <div class="expand" id={`row-${s.id}`}>
                                        {done ? (
                                            picker?.id === s.id
                                                ? <EarlierPicker now={Math.min(clock(), bounds(s.id).hi)} notBefore={bounds(s.id).lo} zone={zone} start={s.actualAt!} label={`Change the time for ${s.label}`} onCancel={() => setPicker(null)} onSave={(ms) => doTick(s.id, ms)} />
                                                : (
                                                    <div class="btn-row">
                                                        <button type="button" class="btn outline" onClick={() => openPicker(s.id, 'change')}>Change time</button>
                                                        <button type="button" class="btn outline" onClick={() => undo(s.id)}>Undo</button>
                                                    </div>
                                                )
                                        ) : (
                                            <>
                                                {detail(s)}
                                                <div class="done-row">
                                                    <button type="button" class="btn big-btn" onClick={() => press(s)}>{doneLabel(s)}</button>
                                                    <button type="button" class="btn outline clock-btn" aria-label="Done earlier" aria-expanded={picker?.id === s.id} onClick={() => openPicker(s.id, 'earlier')}>
                                                        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="8.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M11 6.5V11l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                                                    </button>
                                                </div>
                                                {picker?.id === s.id && (
                                                    <EarlierPicker now={Math.min(clock(), bounds(s.id).hi)} notBefore={bounds(s.id).lo} zone={zone} start={clock()} label={`Done earlier: ${s.label}`} onCancel={() => setPicker(null)} onSave={(ms) => doTick(s.id, ms)} />
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>

            <div class="actions-row">
                <button type="button" class="btn outline" onClick={() => setEditing(!editing)} aria-expanded={editing}>
                    {editing ? 'Hide changes' : 'Change the plan'}
                </button>
                <button type="button" class="btn outline danger" onClick={() => setStopping(true)}>Stop this bake</button>
            </div>
            {editing && (
                <Levers levers={record.levers} zone={zone} locked={{ feedRatio: view.locked.feedRatio, doughTemp: view.locked.doughTemp, fridge: view.locked.fridge }}
                    onChange={(levers) => onChange({ ...record, levers })} />
            )}

            {stopping && (
                <ConfirmSheet
                    title="Stop this bake?" body="The plan and any timers will be thrown away. Nothing is added to your log."
                    confirmLabel="Stop this bake" danger onCancel={() => setStopping(false)} onConfirm={() => { setStopping(false); onStop(); }}
                />
            )}
        </div>
    );
}
