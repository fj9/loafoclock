import { useEffect, useRef, useState } from 'preact/hooks';
import type { LiveRecord } from '../domain/liveStore';
import {
    FOLD_IDS, MINUTE, STEP_ORDER, buildPlan, reconcile, tick, untick, withKeptBakeTime, type LiveStep, type StepId, type Zone
} from '../domain/plan';
import { guideFor } from '../domain/stepGuide';
import { ConfirmSheet } from './ConfirmSheet';
import { Levers } from './Levers';
import { StepDetail } from './StepDetail';
import { Timeline } from './Timeline';
import { clockOf, countdownText, dayTime, lengthOf } from './format';

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

/** Steps where the time you did it sets the timing of everything after, so you are asked when. */
const ASK_WHEN: readonly StepId[] = ['autolyse', 'starterIn'];
const AGO = [
    { label: 'Just now', min: 0 }, { label: '10 min ago', min: 10 }, { label: '20 min ago', min: 20 },
    { label: '30 min ago', min: 30 }, { label: '1 hour ago', min: 60 }
] as const;

/** What the button says for each step. */
const DONE_LABEL: Partial<Record<StepId, string>> = {
    feed: 'I have fed the starter', autolyse: 'I have started the autolyse', starterIn: 'The starter is in',
    salt: 'The salt is in', preShape: 'Pre-shaped', finalShape: 'Shaped', fridge: 'In the fridge',
    ovenOn: 'The oven is on', bake: 'In the oven', out: 'The loaf is out'
};
const doneLabel = (s: LiveStep) => (s.id.startsWith('fold') ? `Fold ${s.id.slice(4)} done` : DONE_LABEL[s.id] ?? 'Done');

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

    const [asking, setAsking] = useState<StepId | null>(null);
    const [editing, setEditing] = useState(false);
    // Which steps have their how-to open. The step that is due starts open; the rest start closed.
    const [how, setHow] = useState<Partial<Record<StepId, boolean>>>({});
    const [stopping, setStopping] = useState(false);
    // The "when did you do this?" sheet takes focus when it opens, closes on Escape, and gives focus back.
    const sheet = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!asking) return;
        const before = document.activeElement as HTMLElement | null;
        sheet.current?.querySelector<HTMLElement>('button')?.focus();
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAsking(null); };
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('keydown', esc); before?.focus?.(); };
    }, [asking]);

    const original = buildPlan(record.original);
    const view = reconcile(original, record.levers, record.actuals, now);
    const { next } = view;

    // Ticking a step closes its panel and, if the step ends in a wait (a rest, a preheat, cooling), starts that timer.
    const doTick = (id: StepId, at: number) => {
        setAsking(null);
        const minutes = guideFor(id, view.plan, (ms) => clockOf(ms, zone)).timerMinutes;
        const end = minutes === undefined ? undefined : at + minutes * MINUTE;
        // Doing a step means the waits before it are over, so their timers go. Then this step's own wait starts.
        const kept = Object.fromEntries(Object.entries(record.timers ?? {}).filter(([k]) => STEP_ORDER.indexOf(k as StepId) >= STEP_ORDER.indexOf(id)));
        const timers = end !== undefined && end > clock() ? { ...kept, [id]: end } : kept;
        onChange({ ...record, actuals: tick(record.actuals, id, at), timers });
    };
    const clearTimer = (id: StepId) => { const { [id]: _gone, ...rest } = record.timers ?? {}; onChange({ ...record, timers: rest }); };
    const undo = (id: StepId) => { const { [id]: _gone, ...rest } = record.timers ?? {}; onChange({ ...record, actuals: untick(record.actuals, id), timers: rest }); };
    const press = (s: LiveStep) => (ASK_WHEN.includes(s.id) ? setAsking(s.id) : doTick(s.id, clock()));
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
                                {' '}<button type="button" class="link" onClick={() => clearTimer(id)}>{left > 0 ? 'Stop' : 'Clear'}</button>
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
                    <button type="button" class="btn big-btn" onClick={() => press(next)}>{doneLabel(next)}</button>
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
                                <button type="button" class="link" onClick={() => onChange({ ...record, levers: withKeptBakeTime(record.levers, kept) })}>Keep my bake time</button>
                            </>
                        ) : (
                            <>The fridge can not go {late ? 'below 8' : 'above 72'} hours, so the bake moves to {when(view.plan.byId.bake)}.</>
                        )}
                    </p>
                );
            })()}

            <section class="panel steps live-steps">
                <h2>Your progress</h2>
                <ol>
                    {view.steps.filter((s) => s.id !== 'carve').map((s) => {
                        const isNext = next?.id === s.id;
                        const open = !isNext && howOpen(s, false);
                        return (
                            <li class={s.status}>
                                <span class="when">{s.actualAt !== undefined ? `Done ${clockOf(s.actualAt, zone)}` : when(s.at)}</span> {s.label}
                                {s.status !== 'done' && s.shiftMin !== 0 && <em class="shift"> ({s.shiftMin > 0 ? '+' : ''}{s.shiftMin} min)</em>}
                                {!isNext && (
                                    <button type="button" class="link" aria-expanded={open} onClick={() => setHow({ ...how, [s.id]: !open })} aria-label={`${open ? 'Hide' : 'Show'} how-to: ${s.label}`}>
                                        {open ? 'Hide how-to' : 'Show how-to'}
                                    </button>
                                )}
                                {s.status === 'done'
                                    ? <button type="button" class="link" onClick={() => undo(s.id)} aria-label={`Undo ${s.label}`}>Undo</button>
                                    : <button type="button" class="link" onClick={() => press(s)} aria-label={`Mark ${s.label} done`}>Done</button>}
                                {open && <div class="row-detail">{detail(s)}</div>}
                            </li>
                        );
                    })}
                </ol>
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

            {asking && (
                <div class="overlay" role="dialog" aria-modal="true" aria-label="When did you do this?">
                    <div class="sheet" ref={sheet}>
                        <h2>When did you do this?</h2>
                        <div class="chips">
                            {AGO.map((a) => (
                                <button type="button" class="chip" onClick={() => doTick(asking, clock() - a.min * MINUTE)}>{a.label}</button>
                            ))}
                        </div>
                        <div class="btn-row"><button type="button" class="btn outline" onClick={() => setAsking(null)}>Cancel</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
