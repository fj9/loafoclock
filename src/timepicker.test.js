import { afterEach, describe, expect, it } from 'vitest';
import { setClock12 } from './clock.js';
import { AUTOLYSE_CHIPS, FEED_CHIPS, clockToSlider, nearestQuarter, sliderToClock, timePickerHtml } from './timepicker.js';

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
    const html = (extra = {}) => timePickerHtml({ id: 'feed-time', key: 'feed', label: 'Feeding at', value: '22:00', chips: FEED_CHIPS, now: '17:45', ...extra });
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
        expect(h).toMatch(/data-time="17:45" data-now="1" aria-pressed="true">Now/);
    });
    it('follows the 24 hour setting', () => {
        expect(html()).toContain('>22:00</div>');
        expect(html()).toMatch(/aria-pressed="true">22:00/);
    });
    it('has chips for autolyse too', () => {
        expect(timePickerHtml({ id: 'need-by-time', key: 'autolyse', label: 'x', value: '08:00', chips: AUTOLYSE_CHIPS })).toContain('data-time="06:00"');
    });
});
