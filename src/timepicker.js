// Quick picks, a big readout and a slider: how you choose a time of day.
import { fmtShort, fmtTime } from './clock.js';
import { parseClock } from './feeding.js';

// Both sliders cover the whole day in 15 minute steps, starting at `base` (minutes after midnight)
export const SLIDERS = {
    feed: { base: 5 * 60, max: 23 * 60 + 45, step: 15 },      // 05:00 round to 04:45
    autolyse: { base: 4 * 60, max: 23 * 60 + 45, step: 15 },  // 04:00 round to 03:45
    day: { base: 0, max: 23 * 60 + 55, step: 5 }              // midnight round to 23:55, for recording times
};

export const sliderToClock = (key, value) => {
    const m = (SLIDERS[key].base + Number(value)) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export const clockToSlider = (key, time) => {
    const { base, max, step } = SLIDERS[key];
    const offset = (parseClock(time) - base + 1440) % 1440;
    return Math.min(max, Math.round(offset / step) * step);
};

/** The nearest `step` minutes to `date`, as "HH:MM". */
export function nearestMinutes(date = new Date(), step = 15) {
    const m = (Math.round((date.getHours() * 60 + date.getMinutes()) / step) * step + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
export const nearestQuarter = (date = new Date()) => nearestMinutes(date, 15);

/** What a "now" or "15 min ago" chip means right now, for a slider with the given step. */
export const chipTime = (chip, key, date = new Date()) => {
    if (!chip.now && !chip.ago) return chip.time;
    return nearestMinutes(new Date(date.getTime() - (chip.ago || 0) * 60000), SLIDERS[key].step);
};

// The times people most often pick; "now" is worked out when the picker is drawn
export const FEED_CHIPS = [
    { now: true }, { time: '07:00' }, { time: '08:00' }, { time: '18:00' }, { time: '20:00' }, { time: '22:00' }
];
// For recording something that just happened
export const JUST_NOW_CHIPS = [{ now: true }, { ago: 15 }, { ago: 30 }, { ago: 60 }];
// Mornings, or a start after lunch
export const AUTOLYSE_CHIPS = [
    { time: '06:00' }, { time: '07:00' }, { time: '08:00' }, { time: '13:00' }, { time: '14:00' }, { time: '15:00' }
];
export const BAKE_CHIPS = [
    { time: '06:00' }, { time: '07:00' }, { time: '08:00' }, { time: '09:00' }, { time: '12:00' }, { time: '18:00' }
];

/**
 * The picker. A hidden input with the given `id` holds the value ("HH:MM") so the rest of the
 * app can read it like any other field.
 */
export function timePickerHtml({ id, key, label, value, chips, date = new Date() }) {
    const chipHtml = chips.map((c) => {
        const time = chipTime(c, key, date);
        const text = c.now ? 'Now' : c.ago ? (c.ago >= 60 ? `${c.ago / 60} hr ago` : `${c.ago} min ago`) : fmtShort(c.time);
        const dyn = c.now || c.ago ? ` data-ago="${c.ago || 0}"` : '';
        return `<button type="button" class="tp-chip" data-time="${time}"${dyn} aria-pressed="${time === value}">${text}</button>`;
    }).join('');
    return `
        <div class="form-group tp" id="${id}-tp">
            <span class="tp-label" id="${id}-label">${label}</span>
            <div class="tp-chips" role="group" aria-labelledby="${id}-label">${chipHtml}</div>
            <div class="tp-readout" id="${id}-readout" aria-live="polite">${fmtTime(value)}</div>
            <input type="range" class="time-slider" id="${id}-slider" min="0" max="${SLIDERS[key].max}" step="${SLIDERS[key].step}" value="${clockToSlider(key, value)}" aria-labelledby="${id}-label">
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
export function bindTimePicker(id, key, onChange, { live = true } = {}) {
    const pick = (value) => { setTimePicker(id, key, value); onChange(value); };
    document.querySelectorAll(`#${id}-tp .tp-chip`).forEach((c) => c.addEventListener('click', () => {
        // "Now" and "15 min ago" mean now, not when the picker was drawn
        pick(c.dataset.ago !== undefined ? chipTime({ ago: Number(c.dataset.ago), now: Number(c.dataset.ago) === 0 }, key) : c.dataset.time);
    }));
    // live: act on every nudge of the slider. Not live: show the time as it moves and act when you let go,
    // for pickers whose surroundings are redrawn by the change (a redraw mid-drag would drop the slider).
    const slider = $(`${id}-slider`);
    slider.addEventListener('input', (e) => {
        const value = sliderToClock(key, e.target.value);
        if (live) pick(value); else setTimePicker(id, key, value);
    });
    if (!live) slider.addEventListener('change', (e) => onChange(sliderToClock(key, e.target.value)));
}


// ---- Date and time ----
const pad2 = (n) => String(n).padStart(2, '0');
export const localDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const localDateTime = (d) => `${localDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

export const DAYS_BACK = [{ label: 'Yesterday', offset: -1 }, { label: 'Today', offset: 0 }];
export const DAYS_AHEAD = [{ label: 'Today', offset: 0 }, { label: 'Tomorrow', offset: 1 }];

/** Whole days from today to the date in "YYYY-MM-DDTHH:MM". */
export function dayOffsetOf(value, today = new Date()) {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    const a = Date.UTC(y, m - 1, d);
    const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((a - b) / 86400000);
}

const dateAt = (offset, today = new Date()) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return localDate(d);
};

/** A day (Yesterday / Today / Tomorrow) plus a time. The hidden input `id` holds "YYYY-MM-DDTHH:MM". */
export function dateTimePickerHtml({ id, label, value, chips, days, today = new Date() }) {
    const full = value || `${localDate(today)}T${nearestMinutes(today, SLIDERS.day.step)}`;
    const offset = dayOffsetOf(full, today);
    const dayChips = days.map((d) =>
        `<button type="button" class="tp-chip" data-offset="${d.offset}" aria-pressed="${d.offset === offset}">${d.label}</button>`).join('');
    return `
        <div class="form-group dtp" id="${id}-dtp">
            <span class="tp-label">${label}</span>
            <div class="tp-chips" role="group" aria-label="Day">${dayChips}</div>
            ${timePickerHtml({ id: `${id}-t`, key: 'day', label: 'Time', value: full.slice(11, 16), chips, date: today })}
            <input type="hidden" id="${id}" value="${full}">
        </div>`;
}

export function setDateTimePicker(id, value, today = new Date()) {
    $(id).value = value;
    setTimePicker(`${id}-t`, 'day', value.slice(11, 16));
    const offset = dayOffsetOf(value, today);
    document.querySelectorAll(`#${id}-dtp [data-offset]`).forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.offset) === offset)));
}

export function bindDateTimePicker(id, onChange) {
    const update = (offset) => {
        const value = `${dateAt(offset)}T${$(`${id}-t`).value}`;
        setDateTimePicker(id, value);
        onChange(value);
    };
    const currentOffset = () => dayOffsetOf($(id).value);
    bindTimePicker(`${id}-t`, 'day', () => update(currentOffset()));
    document.querySelectorAll(`#${id}-dtp [data-offset]`).forEach((c) => c.addEventListener('click', () => update(Number(c.dataset.offset))));
}
