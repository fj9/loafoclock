// HTML for the timeline shown under the progress bar. Pure: takes a schedule from schedule.js.
import { FEEDING_RATIOS } from './feeding.js';
import { PLAN_DEFAULTS } from './schedule.js';

const TEMP_CHOICES = [
    { temp: 21, label: 'Cool kitchen (21°C)' },
    { temp: 24, label: 'Typical (24°C)' },
    { temp: 26, label: 'Warm kitchen (26°C)' }
];

/** "Mon 05:00": the feed day is taken to be `today`. */
export function dayLabel(clock, today = new Date()) {
    const d = new Date(today);
    d.setDate(d.getDate() + clock.days);
    return `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${clock.time}`;
}

export function durationText(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
}

const GAP_SHOWN_MIN = 90;

export function timelineHtml({ schedule, currentStepId, plan, open, today, defaultFeedTime = '' }) {
    if (!schedule) {
        return `<div class="timeline tl-empty">
            <p class="hint" style="margin: 0 0 8px;">Work out your feed in step 1 and your timeline will appear here. Already fed your starter? Tell us when:</p>
            <div class="tl-settings" style="padding: 0;">
                <label>I fed at <input type="time" id="tl-fed-time" value="${defaultFeedTime}"></label>
                <label>Ratio <select id="tl-fed-ratio">${FEEDING_RATIOS.map((r) => `<option value="${r.ratio}"${r.n === 6 ? ' selected' : ''}>${r.ratio}</option>`).join('')}</select></label>
            </div>
            <button type="button" id="tl-fed-go" class="btn btn-small" style="margin-top: 10px;">Show my timeline</button>
        </div>`;
    }
    const events = schedule.events;
    const nextIndex = events.findIndex((e) => e.stepId >= currentStepId);
    const next = events[nextIndex === -1 ? events.length - 1 : nextIndex];
    const when = (c) => dayLabel(c, today);

    let items = '';
    events.forEach((e, i) => {
        const state = e.stepId < currentStepId ? 'done' : i === nextIndex ? 'next' : 'later';
        if (i > 0) {
            const gap = e.minutes - events[i - 1].minutes;
            if (gap >= GAP_SHOWN_MIN) items += `<li class="tl-gap">⏳ ${durationText(gap)} until the next step</li>`;
        }
        items += `<li class="tl-item tl-${state}">
            <span class="tl-time">${when(e.clock)}</span>
            <span class="tl-label">${e.label}${e.until ? `<small> until ${e.until.time}</small>` : ''}${e.note ? `<small> · ${e.note}</small>` : ''}</span>
        </li>`;
    });

    const tempOptions = [...TEMP_CHOICES];
    if (!tempOptions.some((t) => t.temp === plan.temp)) tempOptions.push({ temp: plan.temp, label: `${plan.temp}°C (your reading)` });
    tempOptions.sort((a, b) => a.temp - b.temp);

    return `
        <details class="timeline" id="timeline-details"${open ? ' open' : ''}>
            <summary>🕒 Your timeline<span class="tl-next"> · next: ${next.label.split(' (')[0]} ${when(next.clock)}</span></summary>
            <ol class="tl-list">${items}</ol>
            ${schedule.tooLongInFridge ? '<p class="tl-warn">⚠️ That is more than 72 hours in the fridge. Try fewer extra days.</p>' : ''}
            <h4>Adjust the plan</h4>
            <div class="tl-settings">
                <label>Feeding at <input type="time" id="tl-feed" value="${plan.feedTime}"></label>
                <label>Dough temperature
                    <select id="tl-temp">${tempOptions.map((t) => `<option value="${t.temp}"${t.temp === plan.temp ? ' selected' : ''}>${t.label}</option>`).join('')}</select>
                </label>
                <label>Bake at <input type="time" id="tl-bake" value="${plan.bakeAt}"></label>
                <label>Extra days in the fridge
                    <select id="tl-extra">${[0, 1, 2].map((n) => `<option value="${n}"${n === plan.extraFridgeDays ? ' selected' : ''}>${n === 0 ? 'None' : `+${n} day${n > 1 ? 's' : ''}`}</option>`).join('')}</select>
                </label>
            </div>
            <p class="hint">${durationText(schedule.fridgeHours * 60)} in the fridge (at least ${PLAN_DEFAULTS.minFridgeHours}h). Rest lengths come from the steps, and the times update as you record what really happens.</p>
        </details>`;
}

/** The small line under the progress bar: when the current step is planned for. */
export function progressLabel({ schedule, currentStepId, totalSteps, today }) {
    const base = `Step ${currentStepId} of ${totalSteps}`;
    if (!schedule) return base;
    const e = schedule.events.find((x) => x.stepId === currentStepId);
    return e ? `${base} · planned ${dayLabel(e.clock, today)}` : base;
}
