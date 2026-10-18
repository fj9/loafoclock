import { describe, expect, it } from 'vitest';
import { buildSchedule } from './schedule.js';
import { countdownText, dayLabel, durationText, progressLabel, timelineHtml } from './timeline.js';

const today = new Date(2026, 9, 18); // Sunday 18 Oct 2026
const schedule = buildSchedule({ feedTime: '21:00', riseMinHours: 9 });
const plan = { feedTime: '21:00', temp: 24, bakeAt: '08:00', extraFridgeDays: 0 };

describe('dayLabel / durationText', () => {
    it('names the weekday', () => {
        expect(dayLabel({ time: '21:00', days: 0 }, today)).toBe('Sun 21:00');
        expect(dayLabel({ time: '05:00', days: 1 }, today)).toBe('Mon 05:00');
    });
    it('words durations', () => {
        expect(durationText(270)).toBe('4h 30m');
        expect(durationText(120)).toBe('2h');
        expect(durationText(45)).toBe('45m');
    });
});

describe('timelineHtml', () => {
    it('is a single closed line with no form on step 1, where the calculator has Already fed', () => {
        const html = timelineHtml({ schedule: null, currentStepId: 1, plan, today, defaultFeedTime: '17:40' });
        expect(html).toContain('add your feed time to see it');
        expect(html).not.toContain(' open');
        expect(html).not.toContain('tl-fed-time');
        expect(html).toContain('Already fed');
    });
    it('offers a quick I-fed form on later steps, still collapsed', () => {
        const html = timelineHtml({ schedule: null, currentStepId: 3, plan, today, defaultFeedTime: '17:40' });
        expect(html).toContain('<input type="hidden" id="tl-fed-time" value="17:40">');
        expect(html).toContain('<option value="1:6:6" selected>');
        expect(html).not.toMatch(/<details[^>]* open/);
    });
    it('lists the milestones with weekday times and marks the next one', () => {
        const html = timelineHtml({ schedule, currentStepId: 2, plan, today });
        expect(html).toContain('Mon 05:00');
        expect(html).toContain('Start autolyse');
        expect(html).toMatch(/tl-next">\s*<span class="tl-time">Mon 05:00/);
        expect(html).toContain('tl-done');
    });
    it('shows free time between distant steps', () => {
        expect(timelineHtml({ schedule, currentStepId: 1, plan, today })).toContain('until the next step');
    });
    it('keeps the settings, with the chosen temperature selected', () => {
        const html = timelineHtml({ schedule, currentStepId: 1, plan: { ...plan, temp: 23 }, today });
        expect(html).toContain('value="23" selected');
        expect(html).toContain('(your reading)');
    });
    it('stays open when asked to', () => {
        expect(timelineHtml({ schedule, currentStepId: 1, plan, open: true, today })).toContain('<details class="timeline" id="timeline-details" open>');
    });
});

describe('progressLabel', () => {
    it('shows when the current step is planned', () => {
        expect(progressLabel({ schedule, currentStepId: 2, totalSteps: 10, today })).toBe('Step 2 of 10 · planned Mon 05:00');
        expect(progressLabel({ schedule: null, currentStepId: 2, totalSteps: 10, today })).toBe('Step 2 of 10');
    });
});

describe('countdownText', () => {
    const now = new Date(2026, 9, 18, 12, 0).getTime();
    const min = 60000;
    it('says how long until a moment', () => {
        expect(countdownText(now + 200 * min, now)).toBe('in 3h 20m');
        expect(countdownText(now + 120 * min, now)).toBe('in 2h');
        expect(countdownText(now + 45 * min, now)).toBe('in 45m');
        expect(countdownText(now + 26 * 60 * min, now)).toBe('in 1d 2h');
    });
    it('says how long ago when it has passed', () => {
        expect(countdownText(now - 10 * min, now)).toBe('10m ago');
        expect(countdownText(now - 90 * min, now)).toBe('1h 30m ago');
    });
    it('says now inside a minute', () => {
        expect(countdownText(now + 20_000, now)).toBe('now');
    });
});

describe('timeline countdown in the summary', () => {
    it('shows how long until the next step when the feed moment is known', () => {
        const anchor = new Date(2026, 9, 18, 21, 0).getTime();
        const now = new Date(2026, 9, 18, 19, 40).getTime();
        const html = timelineHtml({ schedule, currentStepId: 1, plan, today, anchorMs: anchor, nowMs: now });
        expect(html).toContain('<span id="tl-countdown"');
        expect(html).toContain('in 1h 20m'); // the feed itself, at 21:00
    });
    it('leaves it out without a feed moment', () => {
        expect(timelineHtml({ schedule, currentStepId: 1, plan, today })).not.toContain('tl-countdown');
    });
});
