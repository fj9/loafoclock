// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { StartNow } from './StartNow';
import { lengthOf, dayLabel, clockOf } from './format';
import { zonedToMs } from '../domain/plan';

const LONDON = 'Europe/London';
const friday9 = zonedToMs({ year: 2026, month: 10, day: 23, hour: 9 }, LONDON);

afterEach(cleanup);

describe('format', () => {
    it('writes lengths and days', () => {
        expect(lengthOf(19.75 * 3_600_000)).toBe('19 h 45 m');
        expect(lengthOf(8 * 3_600_000)).toBe('8 h');
        expect(dayLabel(friday9, friday9, LONDON)).toBe('Today');
        expect(dayLabel(friday9 + 30 * 3_600_000, friday9, LONDON)).toBe('Tomorrow');
        expect(dayLabel(friday9 + 3 * 86_400_000, friday9, LONDON)).toBe('Mon 26 Oct');
        expect(clockOf(friday9, LONDON)).toMatch(/9:00 am|09:00/);
    });
});

describe('Start now', () => {
    it('shows when the loaf is ready to carve and the range', () => {
        render(<StartNow now={friday9} zone={LONDON} />);
        expect(screen.getAllByText('Ready to carve').length).toBeGreaterThan(0);
        expect(screen.getByText(/Fastest/).textContent).toMatch(/no fridge/i);
    });

    it('starts on levers that fit waking hours', () => {
        render(<StartNow now={friday9} zone={LONDON} />);
        expect(screen.queryByRole('list', { name: 'Problems' })).toBeNull();
    });

    it('warns about sleeping hours, offers a nudge, and the nudge fixes it', () => {
        render(<StartNow now={friday9} zone={LONDON} />);
        const fridge = screen.getByLabelText('Time in the fridge') as HTMLInputElement;
        // find a fridge time that lands in the night
        let found = false;
        for (let h = 8; h <= 72 && !found; h += 0.25) {
            fireEvent.input(fridge, { target: { value: String(h) } });
            found = screen.queryByRole('list', { name: 'Problems' }) !== null;
        }
        expect(found).toBe(true);
        fireEvent.click(screen.getByText(/instead$/));
        expect(screen.queryByRole('list', { name: 'Problems' })).toBeNull();
    });

    it('warns about quick feeds', () => {
        render(<StartNow now={friday9} zone={LONDON} />);
        fireEvent.input(screen.getByLabelText(/^Starter feeding time/), { target: { value: '5' } });
        expect(screen.getByText(/Quick feeds are fine/)).toBeTruthy();
    });

    it('skips the fridge and brings it back', () => {
        render(<StartNow now={friday9} zone={LONDON} />);
        fireEvent.click(screen.getByText('Skip the fridge'));
        expect(screen.getByText(/less sourdough loaf/)).toBeTruthy();
        fireEvent.click(screen.getByText('Use the fridge again'));
        expect(screen.getByLabelText('Time in the fridge')).toBeTruthy();
    });
});
