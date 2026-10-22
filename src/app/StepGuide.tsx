import { useEffect, useState } from 'preact/hooks';
import { guideFor } from '../domain/stepGuide';
import type { Plan, StepId, Zone } from '../domain/plan';
import { MINUTE } from '../domain/plan';
import { Tip } from './Tip';
import { clockOf, countdownText } from './format';

interface Props {
    id: StepId;
    plan: Plan;
    zone?: Zone;
    /** When this step's timer ends, if one is running. */
    timerEnd?: number;
    clock: () => number;
    onStartTimer: (endAt: number) => void;
    onStopTimer: () => void;
    /** When the step was done, if it has been. */
    doneAt?: number;
    /** The label for the button that marks this step done. */
    doneLabel: string;
    onDone: () => void;
    onClose: () => void;
}

/** The amounts, instructions and timer for one step. */
export function StepGuide({ id, plan, zone, timerEnd, clock, onStartTimer, onStopTimer, doneAt, doneLabel, onDone, onClose }: Props) {
    const guide = guideFor(id, plan, (ms) => clockOf(ms, zone));
    const [now, setNow] = useState(clock);
    useEffect(() => {
        if (timerEnd === undefined) return;
        const t = setInterval(() => setNow(clock()), 1000);
        return () => clearInterval(t);
    }, [timerEnd, clock]);
    const left = timerEnd === undefined ? null : timerEnd - now;

    return (
        <section class="panel guide" aria-label={`Step: ${guide.title}`}>
            <h2>{guide.title} {guide.tip && <Tip name={guide.tip} />}</h2>
            {guide.ingredients.length > 0 && (
                <ul class="ingredients" aria-label="You will need">{guide.ingredients.map((i) => <li>{i}</li>)}</ul>
            )}
            <ol class="instructions">{guide.instructions.map((i) => <li>{i}</li>)}</ol>
            {guide.note && <p class="hint">{guide.note}</p>}
            {guide.timerMinutes !== undefined && (
                left === null ? (
                    <button type="button" class="btn outline" onClick={() => onStartTimer(clock() + guide.timerMinutes! * MINUTE)}>
                        Start a {guide.timerMinutes} minute timer now
                    </button>
                ) : (
                    <p class="timer">
                        {left > 0 ? <>Timer: <strong>{countdownText(left)}</strong></> : <strong>Time is up</strong>}{' '}
                        <button type="button" class="link" onClick={onStopTimer}>{left > 0 ? 'Stop the timer' : 'Clear'}</button>
                    </p>
                )
            )}
            {doneAt === undefined
                ? <button type="button" class="btn big-btn" onClick={onDone}>{doneLabel}</button>
                : <p class="hint">Done at {clockOf(doneAt, zone)}.</p>}
            <button type="button" class="link" onClick={onClose}>Close</button>
        </section>
    );
}
