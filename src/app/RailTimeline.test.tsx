// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RailTimeline } from './RailTimeline';
import { HOUR, buildPlan, leversAt, setWaking } from '../domain/plan';

beforeEach(() => setWaking());
afterEach(cleanup);

// Thursday 22 Oct 2026, 10:05 pm UTC
const feedAt = Date.UTC(2026, 9, 22, 22, 5);
const levers = leversAt(feedAt, { fridge: { kind: 'hours', hours: 15.25 } });
const text = (c: Element) => Array.from(c.querySelectorAll('.rl-label')).map((e) => e.textContent);

describe('rail timeline', () => {
    it('lists the steps in order, with the four folds as one row', () => {
        const { container } = render(<RailTimeline plan={buildPlan(levers)} zone="UTC" />);
        const rows = text(container);
        expect(rows[0]).toContain('Feed your starter');
        expect(rows[rows.length - 1]).toContain('Ready to carve');
        expect(rows.filter((r) => r!.includes('Four folds'))).toHaveLength(1);
        expect(rows.some((r) => /^Fold \d/.test(r!))).toBe(false);
        expect(rows).toHaveLength(12);
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
