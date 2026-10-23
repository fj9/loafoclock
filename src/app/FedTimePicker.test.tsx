// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FedTimePicker } from './FedTimePicker';
import { setClock12 } from '../domain/clock';
import { HOUR, zonedToMs } from '../domain/plan';

const LONDON = 'Europe/London';
// Friday 23 October 2026, 10:20 am
const now = zonedToMs({ year: 2026, month: 10, day: 23, hour: 10, minute: 20 }, LONDON);
const at = (day: number, hour: number, minute = 0) => zonedToMs({ year: 2026, month: 10, day, hour, minute }, LONDON);

afterEach(() => { cleanup(); setClock12(false); vi.unstubAllGlobals(); });

function Harness({ start }: { start: number }) {
    const [fedAt, setFedAt] = useState(start);
    return <FedTimePicker fedAt={fedAt} now={now} zone={LONDON} onChange={setFedAt} />;
}
const summary = () => screen.getByRole('status').textContent!;
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

describe('feed time picker', () => {
    it('offers quick answers and says what is picked, in words and as a time', () => {
        setClock12(true);
        render(<Harness start={at(23, 8)} />);
        for (const name of ['Just now', '1 h ago', '2 h ago', '4 h ago', 'Last night, 8 pm']) expect(screen.getByRole('button', { name })).toBeTruthy();
        expect(summary()).toContain('Today 8:00 am');
        expect(summary()).toContain('2 h 20 min ago');
    });

    it('a chip sets the time and lights up while it matches', () => {
        render(<Harness start={at(23, 8)} />);
        expect(screen.getByRole('button', { name: '2 h ago' }).getAttribute('aria-pressed')).toBe('false');
        press('2 h ago');
        expect(screen.getByRole('button', { name: '2 h ago' }).getAttribute('aria-pressed')).toBe('true');
        expect(summary()).toContain('2 h ago');
        press('Last night, 8 pm');
        expect(summary()).toContain('Yesterday 20:00');
        expect(screen.getByRole('button', { name: '2 h ago' }).getAttribute('aria-pressed')).toBe('false');
    });

    it('says just now for the moment itself', () => {
        render(<Harness start={at(23, 8)} />);
        press('Just now');
        expect(summary()).toContain('just now');
    });

    it('leaves out a chip that would be before yesterday, or twice', () => {
        // 4 h before 1:20 am is 9:20 pm the night before, which is fine; but at 12:30 am, "Last night, 8 pm" and "4 h ago" are distinct and in range
        const early = zonedToMs({ year: 2026, month: 10, day: 23, hour: 0, minute: 30 }, LONDON);
        const { container } = render(<FedTimePicker fedAt={early - HOUR} now={early} zone={LONDON} onChange={() => {}} />);
        const labels = Array.from(container.querySelectorAll('.chip')).map((c) => c.textContent);
        expect(labels).toContain('Last night, 8 pm');
        expect(new Set(labels).size).toBe(labels.length);
    });

    it('Adjust shows buttons that move the time by 15 minutes or an hour on a computer', () => {
        setClock12(true);
        render(<Harness start={at(23, 8)} />);
        expect(screen.queryByRole('button', { name: '15 minutes earlier' })).toBeNull();
        press('Adjust');
        expect(screen.getByRole('button', { name: 'Done' }).getAttribute('aria-expanded')).toBe('true');
        press('15 minutes earlier');
        expect(summary()).toContain('7:45 am');
        press('One hour later');
        expect(summary()).toContain('8:45 am');
        press('One hour earlier');
        press('15 minutes later');
        expect(summary()).toContain('8:00 am');
        press('Done');
        expect(screen.queryByRole('button', { name: '15 minutes earlier' })).toBeNull();
    });

    it('cannot go into the future, and says so', () => {
        render(<Harness start={now - 10 * 60_000} />);
        press('Adjust');
        press('One hour later');
        expect(screen.getByRole('alert').textContent).toBe('That has not happened yet.');
        expect(summary()).toContain('10 min ago');
        press('15 minutes earlier');
        expect(screen.getByRole('alert').textContent).toBe('');
    });

    it('cannot go back past the start of yesterday, and says so', () => {
        render(<Harness start={at(22, 0, 10)} />);
        press('Adjust');
        press('One hour earlier');
        expect(screen.getByRole('alert').textContent).toBe('You can go back to the start of yesterday.');
        expect(summary()).toContain('Yesterday');
    });

    it('opens the phone\'s own time wheel on a touch screen, and takes the latest time that matches', () => {
        vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('coarse') }));
        render(<Harness start={at(23, 8)} />);
        press('Adjust');
        const wheel = screen.getByLabelText('Time you fed your starter') as HTMLInputElement;
        expect(wheel.type).toBe('time');
        expect(wheel.value).toBe('08:00');
        expect(screen.queryByRole('button', { name: '15 minutes earlier' })).toBeNull();
        // 7:40 am has been, so it means today
        fireEvent.change(wheel, { target: { value: '07:40' } });
        expect(summary()).toContain('Today 07:40');
        // 8:30 pm has not come yet today, so it means last night
        fireEvent.change(wheel, { target: { value: '20:30' } });
        expect(summary()).toContain('Yesterday 20:30');
    });
});
