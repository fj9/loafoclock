// Quick picks, a big readout and a slider: how you choose a time of day.
import { fmtShort, fmtTime } from './clock.js';
import { parseClock } from './feeding.js';

// Both sliders cover the whole day in 15 minute steps, starting at `base` (minutes after midnight)
export const SLIDERS = {
    feed: { base: 5 * 60, max: 23 * 60 + 45 },      // 05:00 round to 04:45
    autolyse: { base: 4 * 60, max: 23 * 60 + 45 }   // 04:00 round to 03:45
};

export const sliderToClock = (key, value) => {
    const m = (SLIDERS[key].base + Number(value)) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const clockToSlider = (key, time) => Math.min(SLIDERS[key].max, (parseClock(time) - SLIDERS[key].base + 1440) % 1440);

/** The nearest quarter hour to `date`, as "HH:MM". */
export function nearestQuarter(date = new Date()) {
    const m = (Math.round((date.getHours() * 60 + date.getMinutes()) / 15) * 15) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// The times people most often pick; "now" is worked out when the picker is drawn
export const FEED_CHIPS = [
    { now: true }, { time: '07:00' }, { time: '08:00' }, { time: '18:00' }, { time: '20:00' }, { time: '22:00' }
];
export const AUTOLYSE_CHIPS = [
    { time: '06:00' }, { time: '07:00' }, { time: '08:00' }, { time: '09:00' }, { time: '12:00' }, { time: '18:00' }
];

/**
 * The picker. A hidden input with the given `id` holds the value ("HH:MM") so the rest of the
 * app can read it like any other field.
 */
export function timePickerHtml({ id, key, label, value, chips, now = nearestQuarter() }) {
    const chipHtml = chips.map((c) => {
        const time = c.now ? now : c.time;
        const text = c.now ? 'Now' : fmtShort(c.time);
        return `<button type="button" class="tp-chip" data-time="${time}"${c.now ? ' data-now="1"' : ''} aria-pressed="${time === value}">${text}</button>`;
    }).join('');
    return `
        <div class="form-group tp" id="${id}-tp">
            <span class="tp-label" id="${id}-label">${label}</span>
            <div class="tp-chips" role="group" aria-labelledby="${id}-label">${chipHtml}</div>
            <div class="tp-readout" id="${id}-readout" aria-live="polite">${fmtTime(value)}</div>
            <input type="range" class="time-slider" id="${id}-slider" min="0" max="${SLIDERS[key].max}" step="15" value="${clockToSlider(key, value)}" aria-labelledby="${id}-label">
            <input type="hidden" id="${id}" value="${value}">
        </div>`;
}

const $ = (id) => document.getElementById(id);

/** Updates the picker's display and value without calling the change handler. */
export function setTimePicker(id, key, value) {
    $(id).value = value;
    $(`${id}-readout`).textContent = fmtTime(value);
    $(`${id}-slider`).value = clockToSlider(key, value);
    document.querySelectorAll(`#${id}-tp .tp-chip`).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.time === value)));
}

/** Wires up the chips and slider; `onChange(value)` runs when the person picks a time. */
export function bindTimePicker(id, key, onChange) {
    const pick = (value) => { setTimePicker(id, key, value); onChange(value); };
    document.querySelectorAll(`#${id}-tp .tp-chip`).forEach((c) => c.addEventListener('click', () => {
        pick(c.dataset.now ? nearestQuarter() : c.dataset.time); // "Now" means now, not when it was drawn
    }));
    $(`${id}-slider`).addEventListener('input', (e) => pick(sliderToClock(key, e.target.value)));
}
