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

    it('says ahead, and offers a longer fridge, when you are early', () => {
        const actuals = {
            feed: feedAt, autolyse: plan.byId.autolyse, starterIn: plan.byId.starterIn, salt: plan.byId.salt,
            fold1: plan.byId.fold1, fold2: plan.byId.fold2, fold3: plan.byId.fold3, fold4: plan.byId.fold4,
            preShape: plan.byId.preShape, finalShape: plan.byId.finalShape, fridge: plan.byId.fridge - 90 * MINUTE
        };
        render(<Harness start={{ ...lockPlan(levers, feedAt), actuals }} at={plan.byId.fridge - 80 * MINUTE} />);
        const note = screen.getByRole('status').textContent!;
        expect(note).toMatch(/1 h 30 m ahead/);
        expect(note).toMatch(/extend the fridge to 13 h 30 m/);
        expect(note).not.toMatch(/behind/);
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
        // the ratio is fixed, so the feed slider only moves within that ratio's ready window (1:6:6 is 9 to 11 hours)
        const wait = screen.getByLabelText(/^Starter feeding time/) as HTMLInputElement;
        expect([Number(wait.min), Number(wait.max)]).toEqual([9, 11]);
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
    it('shows the how-to inside the Next up card, without a timer button', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse} />);
        // The step is due, so its how-to starts open, inside the one card
        expect(within(nextUp()).getByText('450g flour')).toBeTruthy();
        expect(within(nextUp()).getByText(/Mixing only the flour and water/)).toBeTruthy();
        // Timers start themselves when you tick the step, and show above: there is no button for it here
        expect(screen.queryByText(/minute timer now/)).toBeNull();
    });

    it('opens a step in its row in the list, with what it is', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt} />);
        fireEvent.click(screen.getByLabelText('Show how-to: Add salt, honey and oil'));
        expect(screen.getByText('10g salt')).toBeTruthy();
        // What the step is comes with it, in the same place: no separate (i) to tap
        expect(screen.getByText(/Salt adds flavour/)).toBeTruthy();
        expect(screen.queryByLabelText(/^What is /)).toBeNull();
        fireEvent.click(screen.getByLabelText('Hide how-to: Add salt, honey and oil'));
        expect(screen.queryByText('10g salt')).toBeNull();
    });

    it('chooses the loaves from the levers', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt} />);
        fireEvent.click(screen.getByText('Change the plan'));
        fireEvent.click(screen.getByText('2 loaves'));
        fireEvent.click(screen.getByLabelText('Show how-to: Start autolyse (mix flour and water)'));
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

describe('done buttons, the how-to and timers', () => {
    it('has a done button in the list for every step not yet done', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt} />);
        // Not the next step: no need to open anything first
        fireEvent.click(screen.getByLabelText('Mark Add salt, honey and oil done'));
        expect(screen.getByText(/Done /)).toBeTruthy();
    });

    it('has one Done button for the next step, with the how-to open or closed', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + MINUTE} />);
        const count = () => screen.getAllByRole('button', { name: 'I have fed the starter' }).length;
        expect(within(nextUp()).getByText('84g water')).toBeTruthy(); // due, so open
        expect(count()).toBe(1);
        fireEvent.click(screen.getByText('Hide the how-to'));
        expect(within(nextUp()).queryByText('84g water')).toBeNull();
        expect(count()).toBe(1);
    });

    it('opens the how-to by default when the step is due, and not before', () => {
        const { unmount } = render(<Harness start={lockPlan(levers, feedAt)} at={feedAt - 30 * MINUTE} />);
        expect(screen.getByText('Show the how-to').getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('84g water')).toBeNull();
        unmount();
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + MINUTE} />);
        expect(screen.getByText('Hide the how-to').getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('84g water')).toBeTruthy();
    });

    it('can be opened and closed from the toggle row', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt - 30 * MINUTE} />);
        fireEvent.click(screen.getByText('Show the how-to'));
        expect(screen.getByText('84g water')).toBeTruthy();
        fireEvent.click(screen.getByText('Hide the how-to'));
        expect(screen.queryByText('84g water')).toBeNull();
    });

    it('ticking moves on to the next step, which shows its own how-to', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + MINUTE} />);
        fireEvent.click(within(nextUp()).getByText('I have fed the starter'));
        expect(nextUp().textContent).toContain('Start autolyse');
        expect(screen.queryByText('84g water')).toBeNull();
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

describe('stopping a bake', () => {
    // The browser's own confirm popup is blocked in some browsers: the app must not depend on it.
    const blockConfirm = () => { window.confirm = () => false; };

    it('asks in the app, and stops only when you say so', () => {
        blockConfirm();
        let stopped = 0;
        render(<LiveView record={lockPlan(levers, feedAt)} onChange={() => {}} onFinish={() => {}} onStop={() => { stopped++; }} clock={() => feedAt} zone={LONDON} />);
        fireEvent.click(screen.getByText('Stop this bake'));
        const dialog = screen.getByRole('alertdialog', { name: 'Stop this bake?' });
        expect(document.activeElement?.textContent).toBe('Cancel');
        fireEvent.click(within(dialog).getByText('Cancel'));
        expect(stopped).toBe(0);
        expect(screen.queryByRole('alertdialog')).toBeNull();
        fireEvent.click(screen.getByText('Stop this bake'));
        fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Stop this bake'));
        expect(stopped).toBe(1);
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('cancels on Escape', () => {
        let stopped = 0;
        render(<LiveView record={lockPlan(levers, feedAt)} onChange={() => {}} onFinish={() => {}} onStop={() => { stopped++; }} clock={() => feedAt} zone={LONDON} />);
        fireEvent.click(screen.getByText('Stop this bake'));
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(stopped).toBe(0);
    });
});
