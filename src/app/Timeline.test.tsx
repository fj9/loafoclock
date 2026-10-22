// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { Timeline } from './Timeline';
import { HOUR, buildPlan, leversAt } from '../domain/plan';

afterEach(cleanup);

const left = (e: Element) => parseFloat((e as HTMLElement).style.left);

describe('timeline', () => {
    const levers = leversAt(0, { fridge: { kind: 'hours', hours: 15.5 } });

    it('keeps every mark inside the bar, even when steps were recorded out of order', () => {
        const plan = buildPlan(levers, { feed: 20 * HOUR, fridge: 15 * HOUR });
        const { container } = render(<Timeline plan={plan} zone="UTC" now={21 * HOUR} />);
        const width = parseFloat((container.querySelector('.tl-track') as HTMLElement).style.width);
        for (const m of container.querySelectorAll('.tl-mark, .tl-now')) {
            expect(left(m)).toBeGreaterThanOrEqual(-0.5);
            expect(left(m)).toBeLessThanOrEqual(width + 0.5);
        }
    });

    it('shows Now as a line with its label inside it, and flips the label near the right edge', () => {
        const plan = buildPlan(levers);
        const mid = render(<Timeline plan={plan} zone="UTC" now={plan.byId.feed + 3 * HOUR} />);
        const now = mid.container.querySelector('.tl-now')!;
        expect(now.textContent).toBe('Now');
        expect(now.className).not.toContain('flip');
        cleanup();
        const late = render(<Timeline plan={plan} zone="UTC" now={plan.readyToCarve} />);
        expect(late.container.querySelector('.tl-now')!.className).toContain('flip');
    });

    it('does not show Now before the bake has started or after it has finished', () => {
        const plan = buildPlan(levers);
        const before = render(<Timeline plan={plan} zone="UTC" now={plan.byId.feed - 5 * HOUR} />);
        expect(before.container.querySelector('.tl-now')).toBeNull();
        cleanup();
        const after = render(<Timeline plan={plan} zone="UTC" now={plan.readyToCarve + 5 * HOUR} />);
        expect(after.container.querySelector('.tl-now')).toBeNull();
    });
});
