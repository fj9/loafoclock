// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, describe, expect, it } from 'vitest';
import { LiveView } from './LiveView';
import { setClock12 } from '../domain/clock';
import { lockPlan, type LiveRecord } from '../domain/liveStore';
import { HOUR, MINUTE, buildPlan, leversAt, zonedToMs } from '../domain/plan';

const LONDON = 'Europe/London';
const feedAt = zonedToMs({ year: 2026, month: 10, day: 23, hour: 9 }, LONDON);
const levers = leversAt(feedAt, { ratioN: 6, fridge: { kind: 'hours', hours: 12 } });
const plan = buildPlan(levers);

afterEach(() => { cleanup(); setClock12(false); });

function Harness({ start, at }: { start: LiveRecord; at: number }) {
    const [rec, setRec] = useState(start);
    return <LiveView layout="rail" record={rec} onChange={setRec} onFinish={() => {}} clock={() => at} zone={LONDON} />;
}
const nextUp = () => screen.getByRole('region', { name: 'Next up' });
const rail = () => document.querySelector('.rail') as HTMLElement;
const row = (label: string) => within(rail()).getByRole('button', { name: new RegExp(`^${label}`) });
const dots = (cls: string) => rail().querySelectorAll(`.rl-dot.${cls}`).length;

describe('New bake: the progress on the vertical rail', () => {
    it('pins when the loaf is ready and what is next, and shows the rail instead of the list of rows', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + 5 * MINUTE} />);
        expect(document.querySelector('.np-bar')!.textContent).toContain('Ready to carve');
        expect(document.querySelector('.np-bar')!.textContent).toContain('Feed your starter');
        expect(document.querySelector('.rows')).toBeNull();
        expect(rail().querySelectorAll(':scope > li')).toHaveLength(15);
        expect(screen.getByRole('heading', { name: 'Your progress' })).toBeTruthy();
    });

    it('marks the next step, ticks done ones, and moves on when you tap Done', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + 5 * MINUTE} />);
        expect(dots('next')).toBe(1);
        expect(dots('done')).toBe(0);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done' }));
        expect(dots('done')).toBe(1);
        expect(dots('next')).toBe(1);
        expect(nextUp().textContent).toContain('Start the autolyse');
        expect(rail().querySelector('.rl-dot.done svg')).toBeTruthy();
        // the wait after a done step has begun, so it is drawn in full; the waits still to come are paler
        expect(rail().querySelectorAll('.rl-gap.is-done')).toHaveLength(1);
    });

    it('opens a step that is not yet done in place, with the how-to and the same Done button', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + 5 * MINUTE} />);
        const salt = row('Add salt');
        expect(salt.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(salt);
        expect(salt.getAttribute('aria-expanded')).toBe('true');
        const panel = document.getElementById(salt.getAttribute('aria-controls')!)!;
        expect(within(panel).getByRole('button', { name: 'Done' })).toBeTruthy();
        expect(within(panel).getByRole('button', { name: 'Done earlier' })).toBeTruthy();
    });

    it('does not make the next step a button: it is the card above', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + 5 * MINUTE} />);
        expect(within(rail()).queryByRole('button', { name: /^Feed your starter/ })).toBeNull();
        expect(rail().textContent).toContain('Next up');
    });

    it('opens a finished step to Change time and Undo, and Undo puts it back', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + 5 * MINUTE} />);
        fireEvent.click(within(nextUp()).getByRole('button', { name: 'Done' }));
        fireEvent.click(row('Feed your starter'));
        const panel = document.getElementById(row('Feed your starter').getAttribute('aria-controls')!)!;
        expect(within(panel).getAllByRole('button').map((b) => b.textContent)).toEqual(['Change time', 'Undo']);
        fireEvent.click(within(panel).getByRole('button', { name: 'Undo' }));
        expect(dots('done')).toBe(0);
        expect(nextUp().textContent).toContain('Feed your starter');
    });

    it('flags a step that is late', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={plan.readyToCarve + 100 * HOUR} />);
        expect(dots('overdue')).toBeGreaterThan(0);
        expect(document.querySelector('.np-bar')!.textContent).toContain('late');
    });

    it('keeps the Change the plan and Stop this bake buttons, and asks before stopping', () => {
        render(<Harness start={lockPlan(levers, feedAt)} at={feedAt + 5 * MINUTE} />);
        expect(screen.getByRole('button', { name: 'Change the plan' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Stop this bake' }));
        expect(screen.getByText('Stop this bake?')).toBeTruthy();
    });
});
