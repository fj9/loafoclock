// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveView } from './LiveView';
import { setClock12 } from '../domain/clock';
import { lockPlan, type LiveRecord } from '../domain/liveStore';
import { HOUR, MINUTE, STEP_ORDER, buildPlan, leversAt, partsOf, zonedToMs } from '../domain/plan';
import { clockOf } from './format';

const LONDON = 'Europe/London';
const feedAt = zonedToMs({ year: 2026, month: 10, day: 23, hour: 9 }, LONDON);
const levers = leversAt(feedAt, { ratioN: 6, fridge: { kind: 'hours', hours: 12 } });
const plan = buildPlan(levers);

afterEach(() => { cleanup(); setClock12(false); vi.unstubAllGlobals(); });

/** Keeps the record in state, as the app does, with the clock held at a fixed moment. */
function Harness({ start, at, onFinish = () => {} }: { start: LiveRecord; at: number; onFinish?: () => void }) {
    const [rec, setRec] = useState(start);
    return <LiveView record={rec} onChange={setRec} onFinish={onFinish} clock={() => at} zone={LONDON} />;
}
/** "HH:MM" on the local clock. */
const hhmm = (ms: number) => { const p = partsOf(ms, LONDON); return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`; };
/** The time a picker shows in its summary, as the clock writes it (24-hour in these tests unless set otherwise). */
const shownTime = (scope: HTMLElement | Document = document) =>
    within(scope as HTMLElement).getByText((_, el) => el?.tagName === 'STRONG' && !!el.closest('.qt-sum')).textContent!.trim().replace(/^(Today|Yesterday) /, '');
/** Opens the picker's Adjust section (the nudge buttons on a computer). */
const adjust = (scope: HTMLElement | Document = document) => fireEvent.click(within(scope as HTMLElement).getByRole('button', { name: 'Adjust' }));
/** Types a time on the phone's own time wheel, as on a touch screen. */
const typeTime = (hhmmValue: string) => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('coarse') }));
    if (!screen.queryByLabelText('Time you did this')) {
        const toggle = screen.getByRole('button', { name: /^(Adjust|Close)$/ });
        if (toggle.textContent === 'Close') fireEvent.click(toggle); // close it, so it opens again as the wheel
        fireEvent.click(screen.getByRole('button', { name: 'Adjust' }));
    }
    fireEvent.change(screen.getByLabelText('Time you did this'), { target: { value: hhmmValue } });
};
/** A row in the progress list: the whole row is a button that opens it. */
const row = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) });
/** The open part of a row. */
const rowPanel = (label: string) => document.getElementById(row(label).getAttribute('aria-controls')!)!;
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
        adjust();
        fireEvent.click(screen.getByRole('button', { name: '5 minutes later' })); // already at the current time
        expect(screen.getByRole('alert').textContent).toBe('That has not happened yet.');
        expect(shownTime()).toBe(hhmm(t));
        fireEvent.click(screen.getByRole('button', { name: '5 minutes earlier' }));
        fireEvent.click(screen.getByRole('button', { name: '5 minutes earlier' }));
        expect(shownTime()).toBe(hhmm(t - 10 * MINUTE));
        expect(screen.queryByRole('alert')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '5 minutes later' }));
        expect(shownTime()).toBe(hhmm(t - 5 * MINUTE));
        expect(screen.getByText(`Save ${clockOf(t - 5 * MINUTE, LONDON)}`)).toBeTruthy();
    });

    it('offers quick answers, and one tap sets the time', () => {
        const rec = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        const t = plan.byId.autolyse + 30 * MINUTE;
        render(<Harness start={rec} at={t} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        const picker = within(nextUp()).getByRole('group', { name: 'Done earlier' });
        // No "Just now": it opens at the current time, and Done and Save already mean that
        expect(within(picker).getAllByRole('button').map((b) => b.textContent).slice(0, 4)).toEqual(['5 min ago', '10 min ago', '30 min ago', '1 h ago']);
        expect(within(picker).queryByRole('button', { name: 'Just now' })).toBeNull();
        expect(shownTime(picker)).toBe(hhmm(t));
        expect(within(picker).queryAllByRole('button', { pressed: true })).toHaveLength(0);
        fireEvent.click(within(picker).getByRole('button', { name: '10 min ago' }));
        expect(shownTime(picker)).toBe(hhmm(t - 10 * MINUTE));
        expect(within(picker).getByRole('button', { name: '10 min ago' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(within(picker).getByText(`Save ${clockOf(t - 10 * MINUTE, LONDON)}`));
        expect(screen.getByText(new RegExp(`^Done ${clockOf(t - 10 * MINUTE, LONDON)}`))).toBeTruthy();
    });

    it('leaves out a quick answer that would be before the step above it', () => {
        const feedTime = feedAt + HOUR;
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedTime } };
        render(<Harness start={rec} at={feedTime + 20 * MINUTE} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        const picker = within(nextUp()).getByRole('group', { name: 'Done earlier' });
        expect(within(picker).getByRole('button', { name: '10 min ago' })).toBeTruthy();
        expect(within(picker).queryByRole('button', { name: '30 min ago' })).toBeNull();
        expect(within(picker).queryByRole('button', { name: '1 h ago' })).toBeNull();
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
        fireEvent.click(row('Feed your starter'));
        fireEvent.click(within(rowPanel('Feed your starter')).getByRole('button', { name: 'Change time' }));
        const picker = screen.getByRole('group', { name: 'Change the time for Feed your starter' });
        expect(shownTime(picker)).toBe(hhmm(feedAt + 20 * MINUTE));
        adjust(picker);
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
        fireEvent.click(row('Feed your starter'));
        fireEvent.click(within(rowPanel('Feed your starter')).getByRole('button', { name: 'Undo' }));
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
        fireEvent.click(row('Add salt, honey and oil'));
        expect(screen.getByText('10g salt')).toBeTruthy();
        // What the step is comes with it, in the same place: no separate (i) to tap
        expect(screen.getByText(/Salt adds flavour/)).toBeTruthy();
        expect(screen.queryByLabelText(/^What is /)).toBeNull();
        fireEvent.click(row('Add salt, honey and oil')); // tap the row again to close it
        expect(screen.queryByText('10g salt')).toBeNull();
    });

    it('chooses the loaves from the levers', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt} />);
        fireEvent.click(screen.getByText('Change the plan'));
        fireEvent.click(screen.getByText('2 loaves'));
        fireEvent.click(row('Start the autolyse'));
        expect(screen.getByText('900g flour')).toBeTruthy();
    });
});

describe('the done-earlier picker', () => {
    it('has − and + buttons that say how much: −5 min and +5 min', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        adjust();
        expect(screen.getByRole('button', { name: '5 minutes earlier' }).textContent).toBe('−5 min');
        expect(screen.getByRole('button', { name: '5 minutes later' }).textContent).toBe('+5 min');
    });

    it('shows how far each step has moved with the same minus sign', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt - 20 * MINUTE } };
        render(<Harness start={rec} at={feedAt} />);
        const shifts = [...document.querySelectorAll('.shift')].map((e) => e.textContent!);
        expect(shifts.length).toBeGreaterThan(0);
        for (const t of shifts) { expect(t).toMatch(/^ [−+]\d+ min$/); expect(t).not.toContain('-'); }
    });

    it('closes on Escape, and ticks nothing', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={plan.byId.autolyse} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        fireEvent.keyDown(screen.getByRole('button', { name: 'Adjust' }), { key: 'Escape' });
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
        // Not the next step: open its row and press Done there
        fireEvent.click(row('Add salt, honey and oil'));
        fireEvent.click(within(rowPanel('Add salt, honey and oil')).getByRole('button', { name: 'Done' }));
        expect(screen.getByText(/^Done /)).toBeTruthy();
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
        fireEvent.click(row('Start the autolyse'));
        fireEvent.click(within(rowPanel('Start the autolyse')).getByRole('button', { name: 'Undo' }));
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
    it('writes the time with am or pm in 12-hour mode, and records the time you pick', () => {
        setClock12(true);
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        const t = plan.byId.autolyse + 30 * MINUTE;
        render(<Harness start={rec} at={t} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        const picker = within(nextUp()).getByRole('group', { name: 'Done earlier' });
        expect(shownTime(picker)).toBe(clockOf(t, LONDON));
        expect(shownTime(picker)).toMatch(/^\d{1,2}:\d{2} [ap]m$/);
        // Pick 11:10 am on the phone's wheel, which is after the feed it follows
        typeTime('11:10');
        expect(within(picker).getByText(/^Save 11:10 am$/)).toBeTruthy();
    });

    it('writes the time as 24-hour, with no am or pm, in 24-hour mode', () => {
        setClock12(false);
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        const t = plan.byId.autolyse + 30 * MINUTE;
        render(<Harness start={rec} at={t} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        const picker = within(nextUp()).getByRole('group', { name: 'Done earlier' });
        expect(shownTime(picker)).toBe(hhmm(t));
        expect(shownTime(picker)).toMatch(/^\d{2}:\d{2}$/);
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

describe('the progress list rows', () => {
    it('are whole-row buttons, with no small links left in the list', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={feedAt + MINUTE} />);
        const list = document.querySelector('.rows')!;
        expect(list.querySelectorAll('.link')).toHaveLength(0);
        expect(within(list as HTMLElement).getAllByRole('button').length).toBeGreaterThan(10);
        // Each row says what it is and when, in one button
        expect(row('Add salt, honey and oil').textContent).toMatch(/Add salt, honey and oil.*(Tomorrow|Today|Sat)/);
    });

    it('start closed, and opening one does not open another', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt - 30 * MINUTE} />);
        expect(row('Add the starter').getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(row('Add the starter'));
        expect(row('Add the starter').getAttribute('aria-expanded')).toBe('true');
        expect(row('Add salt, honey and oil').getAttribute('aria-expanded')).toBe('false');
    });

    it('the next step is marked, not a second Done button', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt - 30 * MINUTE} />);
        const first = document.querySelector('.rows li.is-next')!;
        expect(first.textContent).toContain('Feed your starter');
        expect(first.textContent).toContain('Next up');
        expect(first.querySelector('button')).toBeNull(); // the card above has its Done button
    });

    it('an open row has the how-to, then the same Done and clock buttons as the card', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt - 30 * MINUTE} />);
        fireEvent.click(row('Add salt, honey and oil'));
        const panel = within(rowPanel('Add salt, honey and oil'));
        expect(panel.getByText('10g salt')).toBeTruthy();
        expect(panel.getByRole('button', { name: 'Done' }).className).toContain('big-btn');
        expect(panel.getByRole('button', { name: 'Done earlier' })).toBeTruthy();
    });

    it('Done earlier inside a row opens the picker there, and saves the time you pick', () => {
        const t = feedAt + HOUR;
        render(<Harness start={lockPlan(levers, feedAt)} at={t} />);
        fireEvent.click(row('Add salt, honey and oil'));
        const panel = within(rowPanel('Add salt, honey and oil'));
        fireEvent.click(panel.getByRole('button', { name: 'Done earlier' }));
        adjust();
        fireEvent.click(screen.getByRole('button', { name: '5 minutes earlier' }));
        fireEvent.click(screen.getByText(`Save ${clockOf(t - 5 * MINUTE, LONDON)}`));
        expect(screen.getByText(new RegExp(`^Done ${clockOf(t - 5 * MINUTE, LONDON)}`))).toBeTruthy();
    });

    it('closes the row when you tick it', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt} />);
        fireEvent.click(row('Add salt, honey and oil'));
        fireEvent.click(within(rowPanel('Add salt, honey and oil')).getByRole('button', { name: 'Done' }));
        expect(row('Add salt, honey and oil').getAttribute('aria-expanded')).toBe('false');
    });

    it('a finished row opens to Change time and Undo, in that order', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt } };
        render(<Harness start={rec} at={feedAt + MINUTE} />);
        fireEvent.click(row('Feed your starter'));
        const buttons = within(rowPanel('Feed your starter')).getAllByRole('button').map((b) => b.textContent);
        expect(buttons).toEqual(['Change time', 'Undo']);
    });
});

describe('times always run in order', () => {
    it('a step cannot be recorded earlier than the step before it', () => {
        const feedTime = feedAt + HOUR; // the feed was recorded at 10:00
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedTime } };
        render(<Harness start={rec} at={feedTime + 3 * HOUR} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done earlier' }));
        adjust();
        const earlier = screen.getByRole('button', { name: '5 minutes earlier' });
        for (let i = 0; i < 60 && !screen.queryByRole('alert'); i++) fireEvent.click(earlier);
        // The buttons stop at the feed time and say why
        expect(screen.getByRole('alert').textContent).toContain(`before ${clockOf(feedTime, LONDON)}`);
        expect(shownTime()).toBe(hhmm(feedTime));
        expect((screen.getByText(/^Save /) as HTMLButtonElement).disabled).toBe(false);
        // Picking an earlier time on the wheel is allowed to move through, but cannot be saved, and says why
        typeTime('06:00');
        expect((screen.getByText(/^Save /) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByRole('alert').textContent).toContain(`before ${clockOf(feedTime, LONDON)}`);
        typeTime(hhmm(feedTime + 30 * MINUTE));
        expect((screen.getByText(/^Save /) as HTMLButtonElement).disabled).toBe(false);
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('ticking a step "earlier" than the one before it records it at that limit', () => {
        const feedTime = feedAt + 2 * HOUR;
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedTime } };
        let saved: LiveRecord = rec;
        function Keep() {
            const [r, setR] = useState(rec);
            saved = r;
            return <LiveView record={r} onChange={setR} onFinish={() => {}} clock={() => feedTime + 2 * HOUR} zone={LONDON} />;
        }
        render(<Keep />);
        fireEvent.click(row('Add salt, honey and oil'));
        fireEvent.click(within(rowPanel('Add salt, honey and oil')).getByRole('button', { name: 'Done' }));
        expect(saved.actuals.salt).toBe(feedTime + 2 * HOUR);
        expect(saved.actuals.salt!).toBeGreaterThanOrEqual(saved.actuals.feed!);
    });

    it('a finished step cannot be moved later than the step after it', () => {
        const rec: LiveRecord = { ...lockPlan(levers, feedAt), actuals: { feed: feedAt + HOUR, autolyse: feedAt + 2 * HOUR } };
        render(<Harness start={rec} at={feedAt + 5 * HOUR} />);
        fireEvent.click(row('Feed your starter'));
        fireEvent.click(within(rowPanel('Feed your starter')).getByRole('button', { name: 'Change time' }));
        adjust();
        const later = screen.getByRole('button', { name: '5 minutes later' });
        for (let i = 0; i < 60 && !screen.queryByRole('alert'); i++) fireEvent.click(later);
        expect(screen.getByRole('alert').textContent).toBe('That has not happened yet.');
        expect(shownTime()).toBe(hhmm(feedAt + 2 * HOUR)); // no later than the autolyse
    });
});
