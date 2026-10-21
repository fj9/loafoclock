import { useEffect, useState } from 'preact/hooks';
import type { LiveRecord } from '../domain/liveStore';
import {
    FOLD_IDS, MINUTE, buildPlan, reconcile, tick, untick, withKeptBakeTime, type LiveStep, type StepId, type Zone
} from '../domain/plan';
import { Levers } from './Levers';
import { StepGuide } from './StepGuide';
import { Timeline } from './Timeline';
import { clockOf, dayLabel, lengthOf } from './format';

interface Props {
    record: LiveRecord;
    onChange: (next: LiveRecord) => void;
    onFinish: () => void;
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
export function LiveView({ record, onChange, onFinish, clock = Date.now, zone }: Props) {
    const [now, setNow] = useState(clock);
    useEffect(() => {
        const t = setInterval(() => setNow(clock()), 15_000);
        return () => clearInterval(t);
    }, [clock]);

    const [asking, setAsking] = useState<StepId | null>(null);
    const [editing, setEditing] = useState(false);
    const [open, setOpen] = useState<StepId | null>(null);

    const original = buildPlan(record.original);
    const view = reconcile(original, record.levers, record.actuals, now);
    const { next } = view;

    const doTick = (id: StepId, at: number) => { setAsking(null); onChange({ ...record, actuals: tick(record.actuals, id, at) }); };
    const press = (s: LiveStep) => (ASK_WHEN.includes(s.id) ? setAsking(s.id) : doTick(s.id, clock()));
    const when = (ms: number) => `${dayLabel(ms, now, zone)}, ${clockOf(ms, zone)}`;

    const countdown = (ms: number) => (ms >= 0 ? `in ${lengthOf(ms)}` : `${lengthOf(-ms)} late`);
    const kept = view.keepBakeTime;

    return (
        <div class="live">
            <Timeline plan={view.plan} zone={zone} now={now} />

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
                    <button type="button" class="btn big-btn" onClick={() => press(next)}>{doneLabel(next)}</button>
                    <button type="button" class="link" onClick={() => setOpen(next.id)}>Open the step</button>
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

            {open && (
                <StepGuide
                    id={open} plan={view.plan} zone={zone} clock={clock} timerEnd={record.timers?.[open]}
                    onStartTimer={(end) => onChange({ ...record, timers: { ...record.timers, [open]: end } })}
                    onStopTimer={() => { const { [open]: _gone, ...rest } = record.timers ?? {}; onChange({ ...record, timers: rest }); }}
                    onClose={() => setOpen(null)}
                />
            )}

            {kept && (
                <p class="problems keep" role="status">
                    You are {lengthOf(Math.abs(view.plan.byId.bake - original.byId.bake))} behind.{' '}
                    {kept.possible ? (
                        <>
                            To bake when you planned, cut the fridge to {lengthOf(kept.fridgeHours * 3_600_000)}.{' '}
                            <button type="button" class="link" onClick={() => onChange({ ...record, levers: withKeptBakeTime(record.levers, kept) })}>Keep my bake time</button>
                        </>
                    ) : (
                        <>The fridge can not go below 8 hours, so the bake moves to {when(view.plan.byId.bake)}.</>
                    )}
                </p>
            )}

            <section class="panel steps live-steps">
                <h2>The steps</h2>
                <ol>
                    {view.steps.filter((s) => s.id !== 'carve').map((s) => (
                        <li class={s.status}>
                            <span class="when">{s.actualAt !== undefined ? `Done ${clockOf(s.actualAt, zone)}` : when(s.at)}</span> {s.label}
                            {s.status !== 'done' && s.shiftMin !== 0 && <em class="shift"> ({s.shiftMin > 0 ? '+' : ''}{s.shiftMin} min)</em>}
                            <button type="button" class="link" onClick={() => setOpen(s.id)} aria-label={`Open ${s.label}`}>Open</button>
                            {s.status === 'done' && (
                                <button type="button" class="link" onClick={() => onChange({ ...record, actuals: untick(record.actuals, s.id) })} aria-label={`Undo ${s.label}`}>Undo</button>
                            )}
                        </li>
                    ))}
                </ol>
            </section>

            <button type="button" class="btn outline" onClick={() => setEditing(!editing)} aria-expanded={editing}>
                {editing ? 'Hide the levers' : 'Change the plan'}
            </button>
            {editing && (
                <Levers levers={record.levers} zone={zone} locked={{ feedRatio: view.locked.feedRatio, doughTemp: view.locked.doughTemp, fridge: view.locked.fridge }}
                    onChange={(levers) => onChange({ ...record, levers })} />
            )}
            <p><button type="button" class="link" onClick={() => { if (confirm('Stop this bake and throw away the plan?')) onFinish(); }}>Stop this bake</button></p>

            {asking && (
                <div class="overlay" role="dialog" aria-modal="true" aria-label="When did you do this?">
                    <div class="sheet">
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
