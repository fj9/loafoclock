// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RailTimeline } from './RailTimeline';
import { setClock12 } from '../domain/clock';
import { HOUR, buildPlan, leversAt, setWaking } from '../domain/plan';

beforeEach(() => { setWaking(); setClock12(true); });
afterEach(cleanup);

// Thursday 22 Oct 2026, 10:05 pm UTC
const feedAt = Date.UTC(2026, 9, 22, 22, 5);
const levers = leversAt(feedAt, { fridge: { kind: 'hours', hours: 15.25 } });
const text = (c: Element) => Array.from(c.querySelectorAll('.rl-label')).map((e) => e.textContent);

describe('rail timeline', () => {
    it('lists every step in order, each fold on its own row', () => {
        const { container } = render(<RailTimeline plan={buildPlan(levers)} zone="UTC" />);
        const rows = text(container);
        expect(rows[0]).toContain('Feed your starter');
        expect(rows[rows.length - 1]).toContain('Ready to carve');
        expect(rows.filter((r) => /^Fold \d/.test(r!))).toHaveLength(4);
        expect(rows).toHaveLength(15);
    });

    it('names each day where it starts', () => {
        const { container } = render(<RailTimeline plan={buildPlan(levers)} zone="UTC" now={feedAt} />);
        const days = Array.from(container.querySelectorAll('.rl-day')).map((e) => e.textContent);
        expect(days.length).toBeGreaterThanOrEqual(3);
        expect(days[0]).toContain('Thu 22 Oct');
    });

    it('draws the main waits and marks the ones that run into the night', () => {
        const { container } = render(<RailTimeline plan={buildPlan(levers)} zone="UTC" />);
        for (const wait of ['rising', 'bulk', 'fridge', 'bake', 'cool']) expect(container.querySelector(`.rl-bar.${wait}`)).toBeTruthy();
        const fridge = container.querySelector('.rl-bar.fridge')!.closest('.rl-gap')!;
        expect(fridge.textContent).toContain('In the fridge · 15 h 15 min');
        expect(fridge.textContent).toContain('Asleep');
    });

    it('draws the night as a band with bedtime and getting up at its edges', () => {
        // A shorter stay in the fridge makes the wait, and so the night inside it, tall enough for both labels.
        const short = buildPlan(leversAt(Date.UTC(2026, 9, 23, 5, 25), { fridge: { kind: 'hours', hours: 8.75 } }));
        const { container } = render(<RailTimeline plan={short} zone="UTC" />);
        const fridge = container.querySelector('.rl-bar.fridge')!.closest('.rl-gap')!;
        const band = fridge.querySelector('.rl-night')!;
        expect(band.querySelector('.bed')!.textContent).toContain('11:00 pm');
        expect(band.querySelector('.wake')!.textContent).toContain('6:00 am');
        expect(fridge.querySelector('.sr-only')!.textContent).toBe('Asleep from 11:00 pm to 6:00 am.');
        expect(container.querySelectorAll('.rl-night').length).toBeGreaterThanOrEqual(1);
    });

    it('keeps the night in one block: a day heading is tinted only when the step under it is in the night', () => {
        // The night falls inside the fridge wait and the heading under it is for 6 am, so it is not part of the band.
        const plan = buildPlan(leversAt(Date.UTC(2026, 9, 23, 5, 25), { fridge: { kind: 'hours', hours: 8.75 } }));
        const fine = render(<RailTimeline plan={plan} zone="UTC" />);
        const days = Array.from(fine.container.querySelectorAll('.rl-day'));
        expect(days.length).toBeGreaterThanOrEqual(2);
        for (const day of days) expect(day.className.includes('in-night')).toBe(day.nextElementSibling!.className.includes('in-night'));
        const wake = days.find((d) => d.nextElementSibling!.textContent!.includes('Turn the oven on'))!;
        expect(wake.className).not.toContain('in-night');
        cleanup();
        // Steps in the night: the band runs through the rows and the heading between them.
        const late = render(<RailTimeline plan={buildPlan(leversAt(Date.UTC(2026, 9, 23, 20, 0)))} zone="UTC" />);
        const tinted = Array.from(late.container.querySelectorAll('.in-night'));
        expect(tinted.some((e) => e.className.includes('rl-day'))).toBe(true);
        expect(tinted.some((e) => e.className.includes('rl-row'))).toBe(true);
    });

    it('rounds the band only where it begins and ends, including when a step is the first thing in it', () => {
        const plan = buildPlan(leversAt(Date.UTC(2026, 9, 23, 9, 50), { ratioN: 6 }));
        const { container } = render(<RailTimeline plan={plan} zone="UTC" />);
        const pieces = Array.from(container.querySelectorAll('.in-night, .rl-night'));
        expect(pieces.length).toBeGreaterThan(2);
        // Walking down the page, a piece that carries on from the one above is not rounded at its top, and one that
        // carries on into the one below is not rounded at its bottom. So the band has exactly as many round tops as round bottoms.
        const top = pieces.filter((e) => e.className.includes('round-top') || (e.className.includes('rl-night') && !e.className.includes('cut-top'))).length;
        const bottom = pieces.filter((e) => e.className.includes('round-bottom') || (e.className.includes('rl-night') && !e.className.includes('cut-bottom'))).length;
        expect(top).toBeGreaterThan(0);
        expect(top).toBe(bottom);
        // Whichever step or heading first shows the band opens it with a rounded top.
        const firstTinted = Array.from(container.querySelectorAll('.rl-row, .rl-day, .rl-night')).find((e) => e.className.includes('in-night') || e.className.includes('rl-night'))!;
        if (!firstTinted.className.includes('rl-night')) expect(firstTinted.className).toContain('round-top');
    });

    it('leaves out a sliver of night too short to hold a rounded corner, and the step beside it closes the band', () => {
        // The loaf goes in at 5:40 am, twenty minutes before getting up: the wait after it has only a sliver of night.
        const plan = buildPlan(leversAt(Date.UTC(2026, 9, 23, 9, 55), { ratioN: 1, fridge: { kind: 'hours', hours: 8 } }));
        const { container } = render(<RailTimeline plan={plan} zone="UTC" />);
        const heights = Array.from(container.querySelectorAll('.rl-night')).map((n) => parseFloat((n as HTMLElement).style.height));
        expect(heights.length).toBeGreaterThan(0);
        for (const h of heights) expect(h).toBeGreaterThanOrEqual(24);
        const tinted = Array.from(container.querySelectorAll('.rl-row')).filter((e) => e.className.includes('in-night'));
        const last = tinted[tinted.length - 1]!;
        expect(last.textContent).toContain('Into the oven');
        expect(last.className).toContain('round-bottom');
    });

    it('gives a short night one label, and a very short one none', () => {
        const { container } = render(<RailTimeline plan={buildPlan(levers)} zone="UTC" />);
        const whole = Array.from(container.querySelectorAll('.rl-night')).filter((n) => !n.className.includes('cut'));
        expect(whole.length).toBeGreaterThan(0);
        const labels = whole.map((n) => ({ h: parseFloat((n as HTMLElement).style.height), text: n.textContent! }));
        for (const { h, text } of labels) {
            if (h >= 44) expect(text).toMatch(/Bedtime.*Up/);
            else if (h >= 26) expect(text).toMatch(/^\s*Asleep 11:00 pm to 6:00 am$/);
            else expect(text).toBe('');
        }
    });

    it('names each wait once, with its whole length', () => {
        const plan = buildPlan(levers);
        const { container } = render(<RailTimeline plan={plan} zone="UTC" />);
        const waits = Array.from(container.querySelectorAll('.rl-wait')).map((e) => e.textContent!);
        expect(waits.filter((w) => w.startsWith('Bulk'))).toHaveLength(1);
        expect(waits.filter((w) => w.startsWith('Starter rising'))).toHaveLength(1);
        expect(waits.find((w) => w.startsWith('Bulk'))).toContain(`Bulk · ${Math.round(plan.bulkHours)} h`);
    });

    it('calls a skipped fridge proofing', () => {
        const plan = buildPlan(leversAt(feedAt, { fridge: { kind: 'none' } }));
        const { container } = render(<RailTimeline plan={plan} zone="UTC" />);
        expect(container.querySelector('.rl-bar.proof')).toBeTruthy();
        expect(container.querySelector('.rl-bar.fridge')).toBeNull();
    });

    it('shows Now only while the bake is under way', () => {
        const plan = buildPlan(levers);
        const mid = render(<RailTimeline plan={plan} zone="UTC" now={plan.byId.feed + 3 * HOUR} />);
        expect(mid.container.querySelectorAll('.rl-now')).toHaveLength(1);
        cleanup();
        for (const now of [plan.byId.feed - HOUR, plan.readyToCarve + HOUR]) {
            const out = render(<RailTimeline plan={plan} zone="UTC" now={now} />);
            expect(out.container.querySelector('.rl-now')).toBeNull();
            cleanup();
        }
    });

    it('flags a step that falls in sleeping hours', () => {
        const plan = buildPlan(leversAt(Date.UTC(2026, 9, 22, 3, 0)));
        const { container } = render(<RailTimeline plan={plan} zone="UTC" />);
        expect(container.querySelector('.rl-dot.asleep')).toBeTruthy();
        expect(container.textContent).toContain('In your sleeping hours');
    });
});
