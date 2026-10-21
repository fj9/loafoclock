// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { LOG_KEY, loadLog } from '../domain/bakeLog';
import { LIVE_KEY, lockPlan } from '../domain/liveStore';
import { STEP_ORDER, buildPlan, leversAt } from '../domain/plan';

beforeEach(() => { localStorage.clear(); document.documentElement.removeAttribute('data-theme'); });
afterEach(cleanup);

const tab = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('App shell', () => {
    it('shows the name and the tagline', () => {
        render(<App />);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toContain("Loaf O'Clock");
        expect(screen.getByText("It's always Loaf O'Clock somewhere.")).toBeTruthy();
    });

    it('moves between the sections', () => {
        render(<App />);
        tab('Log');
        expect(screen.getByText('No bakes yet. When you finish a bake you can log how it went here.')).toBeTruthy();
        tab('Help');
        expect(screen.getByText('Keeping a healthy starter')).toBeTruthy();
        fireEvent.click(screen.getByText("About Loaf O'Clock"));
        expect(screen.getByText('Why I made it')).toBeTruthy();
        tab('Plan');
        expect(screen.getByText('Start a loaf now')).toBeTruthy();
    });

    it('settings change the theme and the clock, and are remembered', () => {
        render(<App />);
        tab('Settings');
        fireEvent.click(screen.getByText('Dark'));
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        fireEvent.click(screen.getByText('19:30'));
        expect(JSON.parse(localStorage.getItem('loafoclockSettings')!)).toMatchObject({ theme: 'dark', clock12: false });
    });
});

describe('finishing a bake', () => {
    const lockedAndDone = () => {
        const levers = leversAt(Date.now() - 40 * 3_600_000, { ratioN: 2, fridge: { kind: 'hours', hours: 12 } });
        const plan = buildPlan(levers);
        const actuals = Object.fromEntries(STEP_ORDER.filter((id) => id !== 'carve').map((id) => [id, plan.byId[id]]));
        localStorage.setItem(LIVE_KEY, JSON.stringify({ v: 1, rec: { ...lockPlan(levers, 0), actuals } }));
    };

    it('logs the bake with the feed ratio and clears the plan', () => {
        lockedAndDone();
        render(<App />);
        fireEvent.click(screen.getByText('Finish this bake'));
        fireEvent.click(screen.getByText('Excellent'));
        fireEvent.input(screen.getByLabelText('Notes'), { target: { value: 'crackly' } });
        fireEvent.click(screen.getByText('Save to the log'));
        expect(localStorage.getItem(LIVE_KEY)).toBeNull();
        expect(loadLog()[0]).toMatchObject({ ratioN: 2, outcome: 'Excellent', notes: 'crackly', loaves: 1 });
        expect(screen.getByText(/Feed 1:2:2/)).toBeTruthy();
    });

    it('can skip the log', () => {
        lockedAndDone();
        render(<App />);
        fireEvent.click(screen.getByText('Finish this bake'));
        fireEvent.click(screen.getByText('Skip the log'));
        expect(loadLog()).toHaveLength(0);
        expect(localStorage.getItem(LIVE_KEY)).toBeNull();
    });
});

describe('the log', () => {
    it('offers to add bakes from the first app, once', () => {
        localStorage.setItem('sourdoughLogs', JSON.stringify([{ date: '2026-05-01T10:00:00.000Z', loaves: 2, size: 'large', outcome: 'Good', notes: 'old one' }]));
        render(<App />);
        tab('Log');
        fireEvent.click(screen.getByText('Add them to this log'));
        expect(screen.getByText('old one')).toBeTruthy();
        expect(screen.queryByText('Add them to this log')).toBeNull();
        expect(localStorage.getItem('sourdoughLogs')).not.toBeNull();
    });

    it('repeats a bake with the same loaves', () => {
        localStorage.setItem(LOG_KEY, JSON.stringify({ v: 1, entries: [{ date: 5, loaves: 2, size: 'large', hydration: 75, notes: '' }] }));
        render(<App />);
        tab('Log');
        fireEvent.click(screen.getByText('Repeat this bake'));
        expect(screen.getByRole('button', { name: '2 loaves', pressed: true })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Large', pressed: true })).toBeTruthy();
        expect((screen.getByLabelText('Hydration') as HTMLSelectElement).value).toBe('75');
    });

    it('nudges after three quick feeds in a row', () => {
        const q = (date: number) => ({ date, loaves: 1, size: 'regular', ratioN: 2, notes: '' });
        localStorage.setItem(LOG_KEY, JSON.stringify({ v: 1, entries: [q(3), q(2), q(1)] }));
        render(<App />);
        fireEvent.change(screen.getByLabelText('Feed'), { target: { value: '2' } });
        expect(screen.getByText(/last 3 bakes all used quick feeds/)).toBeTruthy();
    });
});
