// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { handbookRoute } from './Handbook';

const menu = (name: string) => { fireEvent.click(screen.getByRole('button', { name })); };

beforeEach(() => { localStorage.clear(); window.location.hash = ''; });
afterEach(cleanup);

describe('handbookRoute', () => {
    it('reads the chapter and section from the address', () => {
        expect(handbookRoute('#/handbook')).toEqual({ chapter: undefined, section: undefined });
        expect(handbookRoute('#/handbook/process')).toEqual({ chapter: 'process', section: undefined });
        expect(handbookRoute('#/handbook/process/bulk')).toEqual({ chapter: 'process', section: 'bulk' });
        expect(handbookRoute('#/other')).toEqual({ chapter: undefined, section: undefined });
    });
});

describe('the Handbook page', () => {
    it('opens from its tab with the contents, then a chapter', async () => {
        render(<App />);
        menu('Handbook');
        expect(await screen.findByRole('link', { name: 'The process' })).toBeTruthy();
        expect(screen.queryByText(/Briefing for the AI assistant/)).toBeNull();
        window.location.hash = '#/handbook/levers';
        expect(await screen.findByRole('heading', { name: 'The three levers' })).toBeTruthy();
        expect(screen.getAllByRole('link', { name: 'Handbook home' }).length).toBeGreaterThan(0);
    });

    it('opens straight to a section from a link, and shows the planner\'s own numbers', async () => {
        window.location.hash = '#/handbook/process/bulk';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Bulk fermentation (the first rise)' })).toBeTruthy();
        expect(screen.getAllByText('3–5', { selector: 'td' }).length).toBe(1); // 24°C
    });

    it('takes its address with it when you leave', async () => {
        window.location.hash = '#/handbook/process';
        render(<App />);
        await screen.findByRole('heading', { name: 'The process' });
        fireEvent.click(screen.getByRole('button', { name: /^Log/ }));
        expect(window.location.hash).toBe('');
    });
});

describe('the PDF downloads', () => {
    it('suggest the handbook\'s own file names', async () => {
        render(<App />);
        menu('Handbook');
        await screen.findByRole('link', { name: 'The big picture' }); // the handbook has loaded
        for (const name of ['Loaf-o-clock-sourdough-handbook.pdf', 'Loaf-o-clock-sourdough-handbook-for-ai.pdf']) {
            const link = screen.getAllByRole('link').find((a) => a.getAttribute('href') === name)!;
            expect(link.getAttribute('download')).toBe(name);
        }
    });
});

describe('the worked examples', () => {
    it('are drawn as the planner draws a plan, with days counted from Day 1', async () => {
        window.location.hash = '#/handbook/example-two-day';
        render(<App />);
        await screen.findByRole('heading', { name: 'Two days' });
        await waitFor(() => expect(document.querySelectorAll('.hb-plan').length).toBeGreaterThanOrEqual(1));
        const days = Array.from(document.querySelectorAll('.hb-plan .rl-day')).map((e) => e.textContent);
        expect(days).toContain('Day 2');
        expect(days.some((d) => /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/.test(d ?? ''))).toBe(false);
        expect(document.querySelector('.hb-plan .np-bar')).toBeNull(); // when it is ready to carve is in the text
        expect(document.querySelector('.hb-plan .timeline')).not.toBeNull();
    });
});
