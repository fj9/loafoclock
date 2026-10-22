// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, describe, expect, it } from 'vitest';
import { LiveView } from './LiveView';
import { lockPlan, type LiveRecord } from '../domain/liveStore';
import { HOUR, MINUTE, buildPlan, leversAt, zonedToMs } from '../domain/plan';

const LONDON = 'Europe/London';
const feedAt = zonedToMs({ year: 2026, month: 10, day: 23, hour: 9 }, LONDON);
const levers = leversAt(feedAt, { ratioN: 6, fridge: { kind: 'hours', hours: 12 } });
const plan = buildPlan(levers);

afterEach(cleanup);

/** Keeps the record in state, as the app does, with the clock held at a fixed moment. */
function Harness({ start, at, onFinish = () => {} }: { start: LiveRecord; at: number; onFinish?: () => void }) {
    const [rec, setRec] = useState(start);
    return <LiveView record={rec} onChange={setRec} onFinish={onFinish} clock={() => at} zone={LONDON} />;
}
const nextUp = () => screen.getByRole('region', { name: 'Next up' });

describe('live view', () => {
    it('opens on the first step with a countdown', () => {
        render(<Harness start={lockPlan(levers, feedAt - HOUR)} at={feedAt - 30 * MINUTE} />);
        expect(nextUp().textContent).toContain('Feed your starter');
        expect(nextUp().textContent).toContain('in 30 m');
        expect(nextUp().textContent).toContain('You are free for 30 m');
    });

    it('nothing is ticked until you tap', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={plan.readyToCarve + 100 * HOUR} />);
        expect(nextUp().textContent).toContain('Feed your starter');
        expect(nextUp().textContent).toContain('late');
    });

    it('tapping done moves to the next step', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + 5 * MINUTE} />);
        fireEvent.click(screen.getByText('I have fed the starter'));
        expect(nextUp().textContent).toContain('Start autolyse');
    });

    it('asks when you did the autolyse, and a late one moves the plan', () => {
        const rec = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse + 30 * MINUTE} />);
        fireEvent.click(screen.getByText('I have started the autolyse'));
        expect(screen.getByRole('dialog', { name: 'When did you do this?' })).toBeTruthy();
        fireEvent.click(screen.getByText('30 min ago'));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(nextUp().textContent).toContain('Add the starter');
        // It is recorded at the time you said, not at the moment you tapped
        const doneTime = new Date((plan.byId.autolyse + 30 * MINUTE) - 30 * MINUTE);
        expect(doneTime.getTime()).toBe(plan.byId.autolyse);
        expect(screen.getAllByText(/^Done /).length).toBe(2);
    });

    it('shows four fold dots and ticks each fold on its own', () => {
        const actuals = { feed: feedAt, autolyse: plan.byId.autolyse, starterIn: plan.byId.starterIn, salt: plan.byId.salt };
        render(<Harness start={{ ...lockPlan(levers, feedAt), actuals }} at={plan.byId.fold1} />);
        expect(screen.getAllByRole('listitem', { name: /^Fold \d/ })).toHaveLength(4);
        fireEvent.click(screen.getByText('Fold 1 done'));
        expect(nextUp().textContent).toContain('Fold 2');
        expect(screen.getByLabelText('Fold 1 done')).toBeTruthy();
        expect(screen.getByLabelText('Fold 2 to do')).toBeTruthy();
    });

    it('undoes a tick', () => {
        const rec = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={feedAt + MINUTE} />);
        fireEvent.click(screen.getByLabelText('Undo Feed your starter'));
        expect(nextUp().textContent).toContain('Feed your starter');
    });

    it('offers to keep your bake time when you are late, and keeps it', () => {
        const actuals = {
            feed: feedAt, autolyse: plan.byId.autolyse, starterIn: plan.byId.starterIn, salt: plan.byId.salt,
            fold1: plan.byId.fold1, fold2: plan.byId.fold2, fold3: plan.byId.fold3, fold4: plan.byId.fold4,
            preShape: plan.byId.preShape, finalShape: plan.byId.finalShape, fridge: plan.byId.fridge + 90 * MINUTE
        };
        render(<Harness start={{ ...lockPlan(levers, feedAt), actuals }} at={plan.byId.fridge + 100 * MINUTE} />);
        expect(screen.getByRole('status').textContent).toMatch(/1 h 30 m behind/);
        fireEvent.click(screen.getByText('Keep my bake time'));
        expect(screen.queryByText('Keep my bake time')).toBeNull();
    });

    it('says the bake moves when the fridge cannot give the time back', () => {
        const actuals = {
            feed: feedAt, autolyse: plan.byId.autolyse, starterIn: plan.byId.starterIn, salt: plan.byId.salt,
            fold1: plan.byId.fold1, fold2: plan.byId.fold2, fold3: plan.byId.fold3, fold4: plan.byId.fold4,
            preShape: plan.byId.preShape, finalShape: plan.byId.finalShape, fridge: plan.byId.fridge + 6 * HOUR
        };
        render(<Harness start={{ ...lockPlan(levers, feedAt), actuals }} at={plan.byId.fridge + 6 * HOUR} />);
        expect(screen.getByRole('status').textContent).toMatch(/can not go below 8 hours/);
    });

    it('locks the feed ratio once you have fed, but not the fridge', () => {
        const rec = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={feedAt + MINUTE} />);
        fireEvent.click(screen.getByText('Change the plan'));
        expect((screen.getByLabelText('Feed') as HTMLSelectElement).disabled).toBe(true);
        expect((screen.getByLabelText('Time in the fridge') as HTMLInputElement).disabled).toBe(false);
    });

    it('finishes when the loaf is out', () => {
        let finished = false;
        const actuals = Object.fromEntries(plan.steps.filter((s) => s.id !== 'carve').map((s) => [s.id, s.at]));
        render(<Harness start={{ ...lockPlan(levers, feedAt), actuals }} at={plan.byId.out + MINUTE} onFinish={() => { finished = true; }} />);
        expect(nextUp().textContent).toContain('Ready to carve');
        fireEvent.click(screen.getByText('Finish this bake'));
        expect(finished).toBe(true);
    });
});

describe('steps in the live view', () => {
    it('opens the step with amounts and instructions, and starts a timer that is saved', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        let saved: LiveRecord = rec;
        function Keep() {
            const [r, setR] = useState(rec);
            saved = r;
            return <LiveView record={r} onChange={setR} onFinish={() => {}} clock={() => plan.byId.autolyse} zone={LONDON} />;
        }
        render(<Keep />);
        fireEvent.click(screen.getByText('Open the step'));
        expect(screen.getByRole('region', { name: 'Step: Autolyse' })).toBeTruthy();
        expect(screen.getByText('450g flour')).toBeTruthy();
        fireEvent.click(screen.getByText('Start a 60 minute timer now'));
        expect(saved.timers?.autolyse).toBe(plan.byId.autolyse + 60 * MINUTE);
        expect(screen.getByRole('timer', { name: /Timer for/ }).textContent).toContain('1:00:00');
        fireEvent.click(screen.getByText('Stop the timer'));
        expect(saved.timers?.autolyse).toBeUndefined();
    });

    it('opens any step from the list and shows its tip', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt} />);
        fireEvent.click(screen.getByLabelText('Open Add salt, honey and oil'));
        expect(screen.getByText('10g salt')).toBeTruthy();
        fireEvent.click(screen.getByLabelText('What is salt and enrichments?'));
        expect(screen.getByRole('note').textContent).toContain('Salt adds flavour');
    });

    it('chooses the loaves from the levers', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt} />);
        fireEvent.click(screen.getByText('Change the plan'));
        fireEvent.click(screen.getByText('2 loaves'));
        fireEvent.click(screen.getByLabelText('Open Start autolyse (mix flour and water)'));
        expect(screen.getByText('900g flour')).toBeTruthy();
    });
});

describe('the when-did-you-do-this sheet', () => {
    it('takes focus, closes on Escape and gives focus back', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse} />);
        const button = screen.getByText('I have started the autolyse');
        button.focus();
        fireEvent.click(button);
        expect(document.activeElement?.textContent).toBe('Just now');
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(document.activeElement).toBe(button);
    });
});

describe('reminders', () => {
    it('offers a calendar file for the steps still to come', () => {
        let saved = '';
        const realBlob = globalThis.Blob;
        globalThis.Blob = class extends realBlob { constructor(parts: BlobPart[], o?: BlobPropertyBag) { super(parts, o); saved = String(parts[0]); } } as typeof Blob;
        URL.createObjectURL = () => 'blob:test';
        URL.revokeObjectURL = () => {};
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={feedAt + 5 * MINUTE} />);
        fireEvent.click(screen.getByText('Add reminders to my calendar'));
        globalThis.Blob = realBlob;
        expect(saved).toContain('BEGIN:VCALENDAR');
        expect(saved).toContain('Start autolyse');
        expect(saved).not.toContain('Feed your starter');
    });
});


describe('done buttons, closing the panel and timers', () => {
    it('has a done button in the step panel and in the list for every step not yet done', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt} />);
        // Not the next step: no need to open it first
        fireEvent.click(screen.getByLabelText('Mark Add salt, honey and oil done'));
        expect(screen.getByText(/Done /)).toBeTruthy();
        fireEvent.click(screen.getByLabelText('Open Pre-shape'));
        expect(screen.getByRole('region', { name: 'Step: Pre-shape' }).textContent).toContain('Pre-shaped');
    });

    it('ticking from the step panel closes the panel', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + MINUTE} />);
        fireEvent.click(screen.getByText('Open the step'));
        const panel = screen.getByRole('region', { name: 'Step: Feed your starter' });
        fireEvent.click(within(panel).getByText('I have fed the starter'));
        expect(screen.queryByRole('region', { name: 'Step: Feed your starter' })).toBeNull();
        expect(nextUp().textContent).toContain('Start autolyse');
    });

    it('ticking from the next-up button closes its panel too', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + MINUTE} />);
        fireEvent.click(screen.getByText('Open the step'));
        fireEvent.click(within(nextUp()).getByText('I have fed the starter'));
        expect(screen.queryByRole('region', { name: /^Step:/ })).toBeNull();
    });

    it('starts the wait timer when you tick a step that ends in a wait, and shows it above', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        const at = plan.byId.autolyse;
        render(<Harness start={rec} at={at} />);
        fireEvent.click(screen.getByText('I have started the autolyse'));
        fireEvent.click(screen.getByText('Just now'));
        const timer = screen.getByRole('timer', { name: 'Timer for Start autolyse (mix flour and water)' });
        expect(timer.textContent).toContain('1:00:00');
        expect(timer.textContent).toContain('until');
        // Undoing the step clears its timer
        fireEvent.click(screen.getByLabelText('Undo Start autolyse (mix flour and water)'));
        expect(screen.queryByRole('timer')).toBeNull();
    });

    it('shows time is up and lets you clear it', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt, autolyse: feedAt }, timers: { autolyse: feedAt + 10 * MINUTE } };
        render(<Harness start={rec} at={feedAt + 20 * MINUTE} />);
        expect(screen.getByRole('timer').textContent).toContain('Time is up');
        fireEvent.click(screen.getByText('Clear'));
        expect(screen.queryByRole('timer')).toBeNull();
    });
});
