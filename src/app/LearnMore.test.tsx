// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { LearnMore } from './LearnMore';
import { FinishForm } from './FinishForm';

afterEach(cleanup);

describe('Learn more under a step', () => {
    it('is closed until asked for, then shows the handbook section for the step with a link to all of it', async () => {
        render(<LearnMore step="preShape" />);
        const button = screen.getByRole('button', { name: /Learn more/ });
        expect(button.getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText(/Bulk fermentation/)).toBeNull();
        fireEvent.click(button);
        expect(await screen.findByRole('heading', { name: /Step 5: Bulk fermentation/ })).toBeTruthy();
        const link = screen.getByRole('link', { name: 'Read the full section' }) as HTMLAnchorElement;
        expect(link.getAttribute('href')).toBe('#/handbook/process/bulk');
        expect(screen.getByRole('link', { name: /Step 6: Pre-shape/ })).toBeTruthy();
        fireEvent.click(button);
        expect(screen.queryByRole('link', { name: 'Read the full section' })).toBeNull();
    });
});

describe('the log points to troubleshooting', () => {
    it('only when a bake did not go well', () => {
        render(<FinishForm entry={{ date: 0, loaves: 1, size: 'regular', ratioN: 6, doughTemp: 24 }} onSave={() => {}} onSkip={() => {}} />);
        expect(screen.queryByRole('link', { name: 'The troubleshooting guide' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Good' }));
        expect(screen.queryByRole('link', { name: 'The troubleshooting guide' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Poor' }));
        expect(screen.getByRole('link', { name: 'The troubleshooting guide' }).getAttribute('href')).toBe('#/handbook/troubleshooting');
    });
});
