// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { TimeField } from './TimeField';
import { setClock12 } from '../domain/clock';

afterEach(() => { cleanup(); setClock12(false); });

const sel = (name: string) => screen.getByLabelText(name) as HTMLSelectElement;

describe('time field', () => {
    it('24-hour: hour 0 to 23 and minute, and reports minutes since midnight', () => {
        let got = -1;
        render(<TimeField label="Time" minutes={13 * 60 + 5} onChange={(m) => { got = m; }} />);
        expect(sel('Hour').value).toBe('13');
        expect(sel('Minute').value).toBe('5');
        fireEvent.change(sel('Hour'), { target: { value: '0' } });
        expect(got).toBe(5);
        fireEvent.change(sel('Minute'), { target: { value: '45' } });
        expect(got).toBe(13 * 60 + 45);
    });

    it('12-hour: midnight is 12 am and noon is 12 pm', () => {
        setClock12(true);
        const seen: number[] = [];
        const { rerender } = render(<TimeField label="Time" minutes={0} onChange={(m) => seen.push(m)} />);
        expect([sel('Hour').value, sel('am or pm').value]).toEqual(['12', 'am']);
        rerender(<TimeField label="Time" minutes={12 * 60} onChange={(m) => seen.push(m)} />);
        expect([sel('Hour').value, sel('am or pm').value]).toEqual(['12', 'pm']);
        rerender(<TimeField label="Time" minutes={23 * 60 + 30} onChange={(m) => seen.push(m)} />);
        expect([sel('Hour').value, sel('am or pm').value]).toEqual(['11', 'pm']);
    });

    it('12-hour: changing the hour or am/pm gives the right 24-hour time', () => {
        setClock12(true);
        let got = -1;
        render(<TimeField label="Time" minutes={9 * 60 + 15} onChange={(m) => { got = m; }} />); // 9:15 am
        fireEvent.change(sel('am or pm'), { target: { value: 'pm' } });
        expect(got).toBe(21 * 60 + 15);
        fireEvent.change(sel('Hour'), { target: { value: '12' } });
        expect(got).toBe(0 * 60 + 15); // 12:15 am
    });
});
