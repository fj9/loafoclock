// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, describe, expect, it } from 'vitest';
import { LiveView } from './LiveView';
import { setClock12 } from '../domain/clock';
import { lockPlan, type LiveRecord } from '../domain/liveStore';
import { HOUR, MINUTE, STEP_ORDER, buildPlan, leversAt, partsOf, zonedToMs } from '../domain/plan';
import { clockOf } from './format';

const LONDON = 'Europe/London';
const feedAt = zonedToMs({ year: 2026, month: 10, day: 23, hour: 9 }, LONDON);
const levers = leversAt(feedAt, { ratioN: 6, fridge: { kind: 'hours', hours: 12 } });
const plan = buildPlan(levers);

afterEach(() => { cleanup(); setClock12(false); });

/** Keeps the record in state, as the app does, with the clock held at a fixed moment. */
function Harness({ start, at, onFinish = () => {} }: { start: LiveRecord; at: number; onFinish?: () => void }) {
    const [rec, setRec] = useState(start);
    return <LiveView record={rec} onChange={setRec} onFinish={onFinish} clock={() => at} zone={LONDON} />;
}
/** "HH:MM" on the local clock. */
const hhmm = (ms: number) => { const p = partsOf(ms, LONDON); return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`; };
/** The time shown in a picker's hour and minute selects (24-hour mode), as "HH:MM". */
const shownTime = (scope: HTMLElement | Document = document) => {
    const h = (within(scope as HTMLElement).getByLabelText('Hour') as HTMLSelectElement).value;
    const m = (within(scope as HTMLElement).getByLabelText('Minute') as HTMLSelectElement).value;
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
};
/** Sets the hour and minute selects to an "HH:MM" time. */
const typeTime = (hhmmValue: string) => {
    const [h, m] = hhmmValue.split(':').map(Number);
    fireEvent.change(screen.getByLabelText('Hour'), { target: { value: String(h) } });
    fireEvent.change(screen.getByLabelText('Minute'), { target: { value: String(m) } });
};
const nextUp = () => screen.getByRole('region', { name: 'Next up' });
/** The Done button in the Next up card. */
const done = () => within(nextUp()).getByRole('button', { name: 'Done' });

describe('live view', () => {
    it('opens on the first step with a countdown', () => {
        render(<Harness start={lockPlan(levers, feedAt - HOUR)} at={feedAt - 30 * MINUTE} />);
        expect(nextUp().textContent).toContain('Feed your starter');
        expect(nextUp().textContent).toContain('in 30 min');
        expect(nextUp().textContent).toContain('You are free for 30 min');
    });

    it('nothing is ticked until you tap', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={plan.readyToCarve + 100 * HOUR} />);
        expect(nextUp().textContent).toContain('Feed your starter');
        expect(nextUp().textContent).toContain('late');
    });

    it('tapping done moves to the next step', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + 5 * MINUTE} />);
        fireEvent.click(done());
        expect(nextUp().textContent).toContain('Start the autolyse');
    });

    it('Done ticks at once, with no pop-up, and the clock button opens a picker inside the card', () => {
        const rec = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse + 30 * MINUTE} />);
        expect(screen.queryByRole('dialog')).toBeNull();
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        const picker = within(nextUp()).getByRole('group', { name: 'Done earlier' });
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(shownTime(picker)).toBe(hhmm(plan.byId.autolyse + 30 * MINUTE));
        // Cancel is a button, like the Cancel on the confirmation sheets
        expect(within(picker).getByRole('button', { name: 'Cancel' }).className).toContain('outline');
        fireEvent.click(within(picker).getByText('Cancel'));
        expect(within(nextUp()).queryByRole('group', { name: 'Done earlier' })).toBeNull();
        expect(nextUp().textContent).toContain('Start the autolyse'); // nothing was ticked
        fireEvent.click(done());
        expect(nextUp().textContent).toContain('Add the starter');
    });

    it('the picker steps back in 5 minutes, and cannot go into the future', () => {
        const rec = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        const t = plan.byId.autolyse + 30 * MINUTE;
        render(<Harness start={rec} at={t} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        const later = screen.getByRole('button', { name: '5 minutes later' }) as HTMLButtonElement;
        expect(later.disabled).toBe(true); // already at the current time
        fireEvent.click(screen.getByRole('button', { name: '5 minutes earlier' }));
        fireEvent.click(screen.getByRole('button', { name: '5 minutes earlier' }));
        expect(shownTime()).toBe(hhmm(t - 10 * MINUTE));
        expect(later.disabled).toBe(false);
        expect(screen.getByText(`Save ${clockOf(t - 10 * MINUTE, LONDON)}`)).toBeTruthy();
    });

    it('a time you save is recorded as that time, not the moment you tapped, and moves the plan', () => {
        const rec = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse + 30 * MINUTE} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        typeTime(hhmm(plan.byId.autolyse));
        fireEvent.click(screen.getByText(`Save ${clockOf(plan.byId.autolyse, LONDON)}`));
        expect(nextUp().textContent).toContain('Add the starter');
        expect(screen.getByText(new RegExp(`^Done ${clockOf(plan.byId.autolyse, LONDON)}`))).toBeTruthy();
    });

    it('a time that would be in the future means yesterday, just after midnight', () => {
        const eve = leversAt(zonedToMs({ year: 2026, month: 10, day: 23, hour: 23, minute: 30 }, LONDON));
        const justAfterMidnight = zonedToMs({ year: 2026, month: 10, day: 24, hour: 0, minute: 10 }, LONDON);
        render(<Harness start={lockPlan(eve, 0)} at={justAfterMidnight} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        typeTime('23:50');
        const yesterday = zonedToMs({ year: 2026, month: 10, day: 23, hour: 23, minute: 50 }, LONDON);
        fireEvent.click(screen.getByText(`Save ${clockOf(yesterday, LONDON)}`));
        expect(screen.getByText(new RegExp(`^Done ${clockOf(yesterday, LONDON)}`))).toBeTruthy();
    });

    it('the time on a finished step can be changed afterwards', () => {
        const rec = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt + 20 * MINUTE } };
        render(<Harness start={rec} at={feedAt + 40 * MINUTE} />);
        fireEvent.click(screen.getByRole('button', { name: 'Change the time for Feed your starter' }));
        const picker = screen.getByRole('group', { name: 'Change the time for Feed your starter' });
        expect(shownTime(picker)).toBe(hhmm(feedAt + 20 * MINUTE));
        fireEvent.click(within(picker).getByRole('button', { name: '5 minutes earlier' }));
        fireEvent.click(within(picker).getByText(`Save ${clockOf(feedAt + 15 * MINUTE, LONDON)}`));
        expect(screen.getByText(new RegExp(`^Done ${clockOf(feedAt + 15 * MINUTE, LONDON)}`))).toBeTruthy();
        expect(screen.queryByRole('group')).toBeNull();
    });

    it('shows four fold dots and ticks each fold on its own', () => {
        const actuals = { feed: feedAt, autolyse: plan.byId.autolyse, starterIn: plan.byId.starterIn, salt: plan.byId.salt };
        render(<Harness start={{ ...lockPlan(levers, feedAt), actuals }} at={plan.byId.fold1} />);
        expect(screen.getAllByRole('listitem', { name: /^Fold \d/ })).toHaveLength(4);
        fireEvent.click(screen.getByText("Done fold 1"));
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
        expect(screen.getByRole('status').textContent).toMatch(/1 h 30 min behind/);
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
        expect(note).toMatch(/1 h 30 min ahead/);
        expect(note).toMatch(/extend the fridge to 13 h 30 min/);
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
        fireEvent.click(screen.getByLabelText('Show how-to: Start the autolyse'));
        expect(screen.getByText('900g flour')).toBeTruthy();
    });
});

describe('the done-earlier picker', () => {
    it('closes on Escape, and ticks nothing', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        fireEvent.keyDown(screen.getByLabelText('Time'), { key: 'Escape' });
        expect(screen.queryByRole('group', { name: 'Done earlier' })).toBeNull();
        expect(nextUp().textContent).toContain('Start the autolyse');
    });

    it('has no pop-up sheet any more', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt} />);
        fireEvent.click(done());
        expect(screen.queryByRole('dialog')).toBeNull();
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
        const count = () => within(nextUp()).getAllByRole('button', { name: 'Done' }).length;
        expect(within(nextUp()).getByText('84g water')).toBeTruthy(); // due, so open
        expect(count()).toBe(1);
        fireEvent.click(within(nextUp()).getByText('Hide how-to'));
        expect(within(nextUp()).queryByText('84g water')).toBeNull();
        expect(count()).toBe(1);
    });

    it('opens the how-to by default when the step is due, and not before', () => {
        const { unmount } = render(<Harness start={lockPlan(levers, feedAt)} at={feedAt - 30 * MINUTE} />);
        expect(within(nextUp()).getByText('Show how-to').getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('84g water')).toBeNull();
        unmount();
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + MINUTE} />);
        expect(within(nextUp()).getByText('Hide how-to').getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('84g water')).toBeTruthy();
    });

    it('can be opened and closed from the toggle row', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt - 30 * MINUTE} />);
        fireEvent.click(within(nextUp()).getByText('Show how-to'));
        expect(screen.getByText('84g water')).toBeTruthy();
        fireEvent.click(within(nextUp()).getByText('Hide how-to'));
        expect(screen.queryByText('84g water')).toBeNull();
    });

    it('ticking moves on to the next step, which shows its own how-to', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + MINUTE} />);
        fireEvent.click(done());
        expect(nextUp().textContent).toContain('Start the autolyse');
        expect(screen.queryByText('84g water')).toBeNull();
    });

    it('starts the wait timer when you tick a step that ends in a wait, and shows it above', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        const at = plan.byId.autolyse;
        render(<Harness start={rec} at={at} />);
        fireEvent.click(done());
        const timer = screen.getByRole('timer', { name: 'Timer for Start the autolyse' });
        expect(timer.textContent).toContain('1:00:00');
        expect(timer.textContent).toContain('until');
        // Undoing the step clears its timer
        fireEvent.click(screen.getByLabelText('Undo Start the autolyse'));
        expect(screen.queryByRole('timer')).toBeNull();
    });

    it('clears the timers of earlier steps when you tick a later one, so they do not pile up', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse} />);
        fireEvent.click(done());
        expect(screen.getAllByRole('timer')).toHaveLength(1);
        fireEvent.click(done());
        const timers = screen.getAllByRole('timer');
        expect(timers).toHaveLength(1);
        expect(timers[0]!.getAttribute('aria-label')).toBe('Timer for Add the starter');
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

describe('the Done button', () => {
    it('says "Done" on every step, except a fold, which says which fold', () => {
        const ids = STEP_ORDER.filter((id) => id !== 'carve');
        for (const id of ids) {
            const before = Object.fromEntries(ids.slice(0, ids.indexOf(id)).map((p) => [p, plan.byId[p]]));
            const { unmount } = render(<Harness start={{ ...lockPlan(levers, feedAt), actuals: before }} at={plan.byId[id] + MINUTE} />);
            const label = within(nextUp()).getAllByRole('button').find((b) => b.className.includes('big-btn'))!.textContent!;
            if (id.startsWith('fold')) expect(label, id).toBe(`Done fold ${id.slice(4)}`);
            else expect(label, id).toBe('Done');
            unmount();
        }
    });
});

describe('the keep-bake-time action is a button', () => {
    it('is an outline button, not a link', () => {
        const actuals = {
            feed: feedAt, autolyse: plan.byId.autolyse, starterIn: plan.byId.starterIn, salt: plan.byId.salt,
            fold1: plan.byId.fold1, fold2: plan.byId.fold2, fold3: plan.byId.fold3, fold4: plan.byId.fold4,
            preShape: plan.byId.preShape, finalShape: plan.byId.finalShape, fridge: plan.byId.fridge + 90 * MINUTE
        };
        render(<Harness start={{ ...lockPlan(levers, feedAt), actuals }} at={plan.byId.fridge + 100 * MINUTE} />);
        expect(screen.getByRole('button', { name: 'Keep my bake time' }).className).toContain('outline');
    });
});

describe('the picker follows the Clock setting', () => {
    it('shows hour, minute and am/pm in 12-hour mode, and records the time you pick', () => {
        setClock12(true);
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        const t = plan.byId.autolyse + 30 * MINUTE; // 7:35 am on the local clock
        render(<Harness start={rec} at={t} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        const picker = within(nextUp()).getByRole('group', { name: 'Done earlier' });
        expect((within(picker).getByLabelText('am or pm') as HTMLSelectElement).value).toBe('pm');
        // The hours go 1 to 12, not 0 to 23
        const hours = [...(within(picker).getByLabelText('Hour') as HTMLSelectElement).options].map((o) => o.value);
        expect(hours).toEqual(Array.from({ length: 12 }, (_, i) => String(i + 1)));
        // Pick 6:10 am
        fireEvent.change(within(picker).getByLabelText('Hour'), { target: { value: '6' } });
        fireEvent.change(within(picker).getByLabelText('am or pm'), { target: { value: 'am' } });
        fireEvent.change(within(picker).getByLabelText('Minute'), { target: { value: '10' } });
        expect(within(picker).getByText(/^Save 6:10 am$/)).toBeTruthy();
    });

    it('shows only hour and minute in 24-hour mode', () => {
        setClock12(false);
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        expect(screen.queryByLabelText('am or pm')).toBeNull();
        const hours = [...(screen.getByLabelText('Hour') as HTMLSelectElement).options].map((o) => o.value);
        expect(hours).toHaveLength(24);
    });
});

describe('the timer controls are buttons', () => {
    it('says Stop timer while it runs, and Clear when time is up, both as buttons, not links', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt, autolyse: feedAt }, timers: { autolyse: feedAt + 30 * MINUTE } };
        const { unmount } = render(<Harness start={rec} at={feedAt + 10 * MINUTE} />);
        const stop = screen.getByRole('button', { name: 'Stop timer' });
        expect(stop.className).toContain('outline');
        expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull(); // not confusable with Stop this bake
        unmount();
        render(<Harness start={rec} at={feedAt + 40 * MINUTE} />);
        expect(screen.getByRole('button', { name: 'Clear' }).className).toContain('outline');
    });
});

describe('skipping the fridge in a running bake', () => {
    it('has no tick box once the fridge time can no longer change', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt, ovenOn: plan.byId.ovenOn } };
        render(<Harness start={rec} at={plan.byId.ovenOn + MINUTE} />);
        fireEvent.click(screen.getByText('Change the plan'));
        expect((screen.getByLabelText('Time in the fridge') as HTMLInputElement).disabled).toBe(true);
        expect(screen.queryByLabelText('Skip the fridge')).toBeNull();
    });
});
