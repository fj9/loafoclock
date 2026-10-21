import { afterEach, describe, expect, it } from 'vitest';
import { setClock12 } from '../src/domain/clock';
import { AUTOLYSE_CHIPS, DAYS_BACK, FEED_CHIPS, JUST_NOW_CHIPS, SLIDERS, chipTime, clockToSlider, dateTimePickerHtml, dayOffsetOf, localDateTime, nearestMinutes, nearestQuarter, sliderToClock, timePickerHtml } from './timepicker.js';

afterEach(() => setClock12(false));

describe('slider mapping', () => {
    it('maps the slider to the time of day and back', () => {
        expect(sliderToClock('feed', 0)).toBe('05:00');
        expect(sliderToClock('feed', 1425)).toBe('04:45');
        expect(sliderToClock('autolyse', 0)).toBe('04:00');
        for (const t of ['07:30', '22:00', '00:15', '16:45']) {
            expect(sliderToClock('feed', clockToSlider('feed', t))).toBe(t);
            expect(sliderToClock('autolyse', clockToSlider('autolyse', t))).toBe(t);
        }
    });
    it('covers every quarter hour of the day', () => {
        const seen = new Set();
        for (let v = 0; v <= 1425; v += 15) seen.add(sliderToClock('feed', v));
        expect(seen.size).toBe(96);
    });
});

describe('nearestQuarter', () => {
    it('rounds to 15 minutes', () => {
        expect(nearestQuarter(new Date(2026, 9, 18, 17, 43))).toBe('17:45');
        expect(nearestQuarter(new Date(2026, 9, 18, 17, 7))).toBe('17:00');
        expect(nearestQuarter(new Date(2026, 9, 18, 23, 58))).toBe('00:00');
    });
});

describe('timePickerHtml', () => {
    const html = (extra = {}) => timePickerHtml({ id: 'feed-time', key: 'feed', label: 'Feeding at', value: '22:00', chips: FEED_CHIPS, date: new Date(2026, 9, 18, 17, 43), ...extra });
    it('keeps the value in a hidden input with the given id', () => {
        expect(html()).toContain('<input type="hidden" id="feed-time" value="22:00">');
    });
    it('shows the chosen time large, and presses the matching chip', () => {
        setClock12(true);
        const h = html();
        expect(h).toContain('id="feed-time-readout" aria-live="polite">10:00 pm</div>');
        expect(h).toMatch(/data-time="22:00" aria-pressed="true">10 pm/);
        expect(h).toMatch(/data-time="08:00" aria-pressed="false">8 am/);
    });
    it('has a Now chip that uses the current quarter hour', () => {
        const h = html({ value: '17:45' });
        expect(h).toMatch(/data-time="17:45" data-ago="0" aria-pressed="true">Now/);
    });
    it('follows the 24 hour setting', () => {
        expect(html()).toContain('>22:00</div>');
        expect(html()).toMatch(/aria-pressed="true">22:00/);
    });
    it('has chips for autolyse too', () => {
        expect(timePickerHtml({ id: 'need-by-time', key: 'autolyse', label: 'x', value: '08:00', chips: AUTOLYSE_CHIPS })).toContain('data-time="06:00"');
    });
});

describe('finer picker for recording times', () => {
    const noon = new Date(2026, 9, 18, 12, 7);
    it('slides in 5 minute steps over the whole day', () => {
        expect(SLIDERS.day.step).toBe(5);
        expect(sliderToClock('day', 0)).toBe('00:00');
        expect(sliderToClock('day', 1435)).toBe('23:55');
        expect(clockToSlider('day', '07:32')).toBe(450); // 07:30
    });
    it('rounds now to the picker step', () => {
        expect(nearestMinutes(noon, 5)).toBe('12:05');
        expect(nearestMinutes(noon, 15)).toBe('12:00');
    });
    it('works out "now" and "minutes ago" chips', () => {
        expect(chipTime({ now: true }, 'day', noon)).toBe('12:05');
        expect(chipTime({ ago: 30 }, 'day', noon)).toBe('11:35');
        expect(chipTime({ ago: 60 }, 'day', noon)).toBe('11:05');
        expect(chipTime({ time: '08:00' }, 'day', noon)).toBe('08:00');
        expect(chipTime({ ago: 30 }, 'day', new Date(2026, 9, 18, 0, 10))).toBe('23:40'); // across midnight
    });
    it('draws ago chips with words', () => {
        const h = timePickerHtml({ id: 'x', key: 'day', label: 'Start', value: '12:05', chips: JUST_NOW_CHIPS, date: noon });
        expect(h).toContain('>Now</button>');
        expect(h).toContain('>15 min ago</button>');
        expect(h).toContain('>1 hr ago</button>');
        expect(h).toContain('step="5"');
    });
});

describe('date and time picker', () => {
    const today = new Date(2026, 9, 18, 17, 40); // Sunday 18 Oct
    it('formats a local date and time', () => {
        expect(localDateTime(today)).toBe('2026-10-18T17:40');
    });
    it('counts days from today', () => {
        expect(dayOffsetOf('2026-10-18T09:00', today)).toBe(0);
        expect(dayOffsetOf('2026-10-19T09:00', today)).toBe(1);
        expect(dayOffsetOf('2026-10-17T23:00', today)).toBe(-1);
        expect(dayOffsetOf('2026-11-01T00:00', today)).toBe(14);
    });
    it('keeps the full date and time in a hidden input, and presses the right day', () => {
        const h = dateTimePickerHtml({ id: 'retard-start-time', label: 'Start', value: '2026-10-17T22:00', chips: JUST_NOW_CHIPS, days: DAYS_BACK, today });
        expect(h).toContain('<input type="hidden" id="retard-start-time" value="2026-10-17T22:00">');
        expect(h).toMatch(/data-offset="-1" aria-pressed="true">Yesterday/);
        expect(h).toMatch(/data-offset="0" aria-pressed="false">Today/);
        expect(h).toContain('id="retard-start-time-t"');
    });
    it('defaults to now, today, when there is no value', () => {
        const h = dateTimePickerHtml({ id: 'f', label: 'x', value: '', chips: JUST_NOW_CHIPS, days: DAYS_BACK, today });
        expect(h).toContain('value="2026-10-18T17:40"');
        expect(h).toMatch(/data-offset="0" aria-pressed="true">Today/);
    });
});
