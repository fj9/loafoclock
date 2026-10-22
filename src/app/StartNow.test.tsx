// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { StartNow } from './StartNow';
import { lengthOf, dayLabel, clockOf, dayTime, dayInSentence, shortDate, signedMin } from './format';
import { zonedToMs } from '../domain/plan';

const LONDON = 'Europe/London';
const friday9 = zonedToMs({ year: 2026, month: 10, day: 23, hour: 9 }, LONDON);

afterEach(cleanup);

describe('format', () => {
    it('writes lengths and days', () => {
        expect(lengthOf(19.75 * 3_600_000)).toBe('19 h 45 min');
        expect(lengthOf(8 * 3_600_000)).toBe('8 h');
        expect(dayLabel(friday9, friday9, LONDON)).toBe('Today');
        expect(dayLabel(friday9 + 30 * 3_600_000, friday9, LONDON)).toBe('Tomorrow');
        expect(dayLabel(friday9 + 3 * 86_400_000, friday9, LONDON)).toBe('Mon 26 Oct');
        expect(clockOf(friday9, LONDON)).toMatch(/9:00 am|09:00/);
    });
});

describe('dates and times are written one way', () => {
    it('labels: "Tomorrow 5:49 am", with no comma and no "at"', () => {
        const t = friday9 + 24 * 3_600_000;
        expect(dayTime(friday9, friday9, LONDON)).toMatch(/^Today 9:00 am$|^Today 09:00$/);
        expect(dayTime(t, friday9, LONDON)).toMatch(/^Tomorrow /);
        expect(dayTime(friday9 + 3 * 86_400_000, friday9, LONDON)).toMatch(/^Mon 26 Oct /);
        expect(dayTime(t, friday9, LONDON)).not.toMatch(/,| at /);
    });
    it('sentences use "today", "tomorrow" or the date', () => {
        expect(dayInSentence(friday9, friday9, LONDON)).toBe('today');
        expect(dayInSentence(friday9 + 24 * 3_600_000, friday9, LONDON)).toBe('tomorrow');
        expect(dayInSentence(friday9 + 3 * 86_400_000, friday9, LONDON)).toBe('Mon 26 Oct');
    });
    it('the log shows "Sat 24 Oct", and the year only when it is not this year', () => {
        expect(shortDate(zonedToMs({ year: 2026, month: 10, day: 24, hour: 12 }, LONDON), friday9, LONDON)).toBe('Sat 24 Oct');
        expect(shortDate(zonedToMs({ year: 2025, month: 12, day: 25, hour: 12 }, LONDON), friday9, LONDON)).toBe('Thu 25 Dec 2025');
    });
    it('Start now writes the carve time the same way', () => {
        render(<StartNow now={friday9} zone={LONDON} />);
        const big = document.querySelector('.result .big')!.textContent!;
        expect(big).toMatch(/^(Today|Tomorrow|[A-Z][a-z]{2} \d+ [A-Z][a-z]{2}) /);
        expect(big).not.toContain(' at ');
    });
});

describe('lever tips', () => {
    it('are (i) buttons beside each label that open a short explanation, not lines of text', () => {
        render(<StartNow now={friday9} zone={LONDON} />);
        expect(screen.queryByText(/How long after feeding the starter goes into the dough/)).toBeNull();
        const tips = document.querySelectorAll('.info-btn');
        expect(tips.length).toBe(6);
        fireEvent.click(screen.getByLabelText('What is dough temperature?'));
        expect(screen.getByRole('note').textContent).toContain('Warmer dough rises faster');
    });
});

describe('labels and durations', () => {
    it('changes in minutes use a true minus sign, and a plus', () => {
        expect(signedMin(-108)).toBe('−108 min');
        expect(signedMin(10)).toBe('+10 min');
        expect(signedMin(-5)).not.toContain('-'); // not a hyphen
    });
    it('the timeline says "Bake" for the end of the bake', () => {
        render(<StartNow now={friday9} zone={LONDON} />);
        expect(screen.getByText('Bake')).toBeTruthy();
        expect(screen.queryByText(/Bake and carve/)).toBeNull();
    });
    it('durations are written with h and min', () => {
        expect(lengthOf(90 * 60_000)).toBe('1 h 30 min');
        expect(lengthOf(40 * 60_000)).toBe('40 min');
        expect(lengthOf(8 * 3_600_000)).toBe('8 h');
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

    it('skips the fridge with a tick box, the slider stays in place, and unticking brings the time back', () => {
        render(<StartNow now={friday9} zone={LONDON} />);
        const slider = screen.getByLabelText('Time in the fridge') as HTMLInputElement;
        fireEvent.input(slider, { target: { value: '20' } });
        const tick = screen.getByLabelText('Skip the fridge') as HTMLInputElement;
        expect(tick.type).toBe('checkbox');
        expect(tick.checked).toBe(false);
        fireEvent.click(tick);
        // Nothing jumps: the same slider is still there, greyed out, and says it is skipped
        const after = screen.getByLabelText('Time in the fridge') as HTMLInputElement;
        expect(after.disabled).toBe(true);
        expect(screen.getByText('Skipped')).toBeTruthy();
        expect(screen.getByText(/less sourdough loaf/)).toBeTruthy();
        fireEvent.click(screen.getByLabelText('Skip the fridge'));
        const back = screen.getByLabelText('Time in the fridge') as HTMLInputElement;
        expect(back.disabled).toBe(false);
        expect(back.value).toBe('20'); // the time you had is restored
        expect(screen.queryByText('Skipped')).toBeNull();
    });
});

describe('reminders on the plan page', () => {
    it('downloads a calendar file for the plan under Start this plan', () => {
        let saved = '';
        const realBlob = globalThis.Blob;
        globalThis.Blob = class extends realBlob { constructor(parts: BlobPart[], o?: BlobPropertyBag) { super(parts, o); saved = String(parts[0]); } } as typeof Blob;
        URL.createObjectURL = () => 'blob:test';
        URL.revokeObjectURL = () => {};
        render(<StartNow now={friday9} zone={LONDON} onStart={() => {}} />);
        fireEvent.click(screen.getByText('Add reminders to my calendar'));
        globalThis.Blob = realBlob;
        expect(saved).toContain('BEGIN:VCALENDAR');
        expect(saved).toContain('TRIGGER:-PT10M');
    });
});
