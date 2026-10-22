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
    /** Show the "what is this?" hint here. The Next up card has it beside its title instead. */
    showTip?: boolean;
}

/** The amounts, the instructions and the timer for one step. It sits inside a card or a list row. */
export function StepDetail({ id, plan, zone, timerEnd, clock, onStartTimer, onStopTimer, showTip }: Props) {
    const guide = guideFor(id, plan, (ms) => clockOf(ms, zone));
    const [now, setNow] = useState(clock);
    useEffect(() => {
        if (timerEnd === undefined) return;
        const t = setInterval(() => setNow(clock()), 1000);
        return () => clearInterval(t);
    }, [timerEnd, clock]);
    const left = timerEnd === undefined ? null : timerEnd - now;

    return (
        <div class="step-detail">
            {showTip && guide.tip && <p class="what">What is this? <Tip name={guide.tip} /></p>}
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
        </div>
    );
}
