// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { handbookRoute } from './Handbook';

const menu = (name: string) => { fireEvent.click(screen.getByRole('button', { name: 'Menu' })); fireEvent.click(screen.getByRole('menuitem', { name })); };

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
    it('opens from the menu with the contents, then a chapter', async () => {
        render(<App />);
        menu('Handbook');
        expect(await screen.findByRole('link', { name: '6. The process, step by step' })).toBeTruthy();
        expect(screen.queryByText(/Briefing for the AI assistant/)).toBeNull();
        window.location.hash = '#/handbook/levers';
        expect(await screen.findByRole('heading', { name: '7. The three levers: feed ratio, temperature, cold retard' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'All of the handbook' })).toBeTruthy();
    });

    it('opens straight to a section from a link, and shows the planner\'s own numbers', async () => {
        window.location.hash = '#/handbook/process/bulk';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Step 5: Bulk fermentation (the first rise)' })).toBeTruthy();
        expect(screen.getAllByText('5h 30m', { selector: 'td' }).length).toBe(2); // 26 and 27°C
    });

    it('takes its address with it when you leave', async () => {
        window.location.hash = '#/handbook/process';
        render(<App />);
        await screen.findByRole('heading', { name: '6. The process, step by step' });
        fireEvent.click(screen.getByRole('button', { name: /^Log/ }));
        expect(window.location.hash).toBe('');
    });
});

describe('the PDF downloads', () => {
    it('suggest the handbook\'s own file names', async () => {
        render(<App />);
        menu('Handbook');
        await screen.findByRole('link', { name: '1. The big picture' }); // the handbook has loaded
        for (const name of ['Loaf-o-clock-sourdough-handbook.pdf', 'Loaf-o-clock-sourdough-handbook-for-ai.pdf']) {
            const link = screen.getAllByRole('link').find((a) => a.getAttribute('href') === name)!;
            expect(link.getAttribute('download')).toBe(name);
        }
    });
});
