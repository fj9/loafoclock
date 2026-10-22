// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, describe, expect, it } from 'vitest';
import { BreadAt } from './BreadAt';
import { CarvePicker } from './CarvePicker';
import { chipDay, fullDay } from './format';
import { minutesOfDay, partsOf, zonedToMs } from '../domain/plan';

const LONDON = 'Europe/London';
const wed = zonedToMs({ year: 2026, month: 10, day: 21, hour: 9 }, LONDON);

afterEach(cleanup);

function Harness({ start }: { start: number }) {
    const [v, setV] = useState(start);
    return (<><CarvePicker value={v} now={wed} zone={LONDON} onChange={setV} /><output data-testid="v">{v}</output></>);
}
const value = () => Number(screen.getByTestId('v').textContent);

describe('carve picker', () => {
    it('labels days and writes the full date', () => {
        expect(chipDay(wed, wed, LONDON)).toBe('Today');
        expect(chipDay(wed + 86_400_000, wed, LONDON)).toBe('Tomorrow');
        expect(chipDay(wed + 5 * 86_400_000, wed, LONDON)).toBe('Mon 26');
        expect(fullDay(zonedToMs({ year: 2026, month: 10, day: 25, hour: 12 }, LONDON), LONDON)).toBe('Sunday 25 October');
    });

    it('a meal chip sets the time, and the day chip keeps it, across the clocks changing', () => {
        const start = zonedToMs({ year: 2026, month: 10, day: 23, hour: 12, minute: 30 }, LONDON);
        render(<Harness start={start} />);
        fireEvent.click(screen.getByText('Supper'));
        expect(minutesOfDay(value(), LONDON)).toBe(20 * 60 + 30);
        fireEvent.click(screen.getByText('Sun 25'));
        expect(partsOf(value(), LONDON)).toMatchObject({ day: 25, hour: 20, minute: 30 });
    });

    it('lights the meal chip when the slider sits on it, and sets the time on release', () => {
        const start = zonedToMs({ year: 2026, month: 10, day: 23, hour: 12, minute: 30 }, LONDON);
        render(<Harness start={start} />);
        expect(screen.getByText('Lunch').getAttribute('aria-pressed')).toBe('true');
        const slider = screen.getByLabelText(/^Time:/) as HTMLInputElement;
        fireEvent.input(slider, { target: { value: String(16 * 60) } });
        expect(minutesOfDay(value(), LONDON)).toBe(12 * 60 + 30); // not yet
        fireEvent.change(slider, { target: { value: String(16 * 60) } });
        expect(minutesOfDay(value(), LONDON)).toBe(16 * 60);
        expect(screen.getByText('Tea').getAttribute('aria-pressed')).toBe('true');
    });
});

describe('Bread at', () => {
    it('shows plan cards for the default time and opens one with its timeline and levers', () => {
        render(<BreadAt now={wed} zone={LONDON} />);
        const cards = screen.getAllByRole('button', { pressed: false }).filter((b) => b.classList.contains('plan-card'));
        expect(cards.length).toBeGreaterThan(0);
        fireEvent.click(cards[0]!);
        expect(screen.getByRole('region', { name: 'Your plan' })).toBeTruthy();
        expect(screen.getByLabelText('Time in the fridge')).toBeTruthy();
    });

    it('says so when nothing fits', () => {
        render(<BreadAt now={wed} zone={LONDON} />);
        fireEvent.click(screen.getByText('Today'));
        expect(screen.getByRole('status').textContent).toMatch(/no way to fit/i);
    });
});

describe('meal chips', () => {
    it('are Breakfast, Late breakfast, Lunch, Tea and Supper, with no Dinner', () => {
        render(<BreadAt now={wed} zone={LONDON} />);
        const meals = within(screen.getByRole('group', { name: 'Meal' })).getAllByRole('button').map((b) => b.textContent);
        expect(meals).toEqual(['Breakfast', 'Late breakfast', 'Lunch', 'Tea', 'Supper']);
    });
});
