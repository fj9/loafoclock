import { describe, expect, it } from 'vitest';
import { buildSchedule } from './schedule.js';
import { dayLabel, durationText, progressLabel, timelineHtml } from './timeline.js';

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
    it('asks for a feed time when there is no schedule yet, and lets you say when you fed', () => {
        const html = timelineHtml({ schedule: null, currentStepId: 1, plan, today, defaultFeedTime: '17:40' });
        expect(html).toContain('appear here');
        expect(html).toContain('id="tl-fed-time" value="17:40"');
        expect(html).toContain('<option value="1:6:6" selected>');
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
