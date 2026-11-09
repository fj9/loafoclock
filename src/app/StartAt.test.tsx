// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StartAt } from './StartAt';
import { zonedToMs } from '../domain/plan';

const LONDON = 'Europe/London';
// Monday 9 November 2026, 2:15 pm
const now = zonedToMs({ year: 2026, month: 11, day: 9, hour: 14, minute: 15 }, LONDON);

afterEach(cleanup);

describe('Start at…', () => {
    it('starts on this evening and lists the options with a carve time each', () => {
        render(<StartAt now={now} zone={LONDON} />);
        expect(screen.getByRole('heading', { name: /Feed today at/ })).toBeTruthy();
        const cards = screen.getAllByRole('button', { pressed: false });
        expect(cards.some((b) => /Overnight in the fridge/.test(b.textContent ?? ''))).toBe(true);
        expect(screen.getAllByText('Carve').length).toBeGreaterThan(0);
        expect(screen.getByRole('img', { name: 'When each plan is ready to carve' })).toBeTruthy();
    });

    it('opens your plan when a card is chosen, and changing the time closes it', () => {
        render(<StartAt now={now} zone={LONDON} onStart={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', { name: /Overnight in the fridge/ }));
        expect(screen.getByRole('region', { name: 'Your plan' })).toBeTruthy();
        fireEvent.click(screen.getByText('Lunchtime'));
        expect(screen.queryByRole('region', { name: 'Your plan' })).toBeNull();
    });

    it('offers the next waking time when the feed is in the night', () => {
        render(<StartAt now={now} zone={LONDON} />);
        fireEvent.click(screen.getByRole('button', { name: 'Tomorrow' }));
        fireEvent.change(screen.getByLabelText(/Time:/), { target: { value: '1410' } });
        expect(screen.getByText('That is in your sleeping hours')).toBeTruthy();
        fireEvent.click(screen.getByText(/Feed at .* instead/));
        expect(screen.queryByText('That is in your sleeping hours')).toBeNull();
    });

    it('says when the time has passed', () => {
        render(<StartAt now={now} zone={LONDON} />);
        fireEvent.click(screen.getByText('Morning'));
        expect(screen.getByText('That time has passed')).toBeTruthy();
        within(screen.getByRole('status')).getByText(/next time you are awake/);
    });
});
