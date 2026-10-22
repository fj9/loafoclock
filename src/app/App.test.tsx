// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { LOG_KEY, loadLog } from '../domain/bakeLog';
import { LIVE_KEY, lockPlan } from '../domain/liveStore';
import { STEP_ORDER, buildPlan, leversAt, setWaking } from '../domain/plan';

beforeEach(() => { setWaking(); localStorage.clear(); document.documentElement.removeAttribute('data-theme'); });
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
        fireEvent.input(screen.getByLabelText(/^Starter feeding time/), { target: { value: '5' } });
        expect(screen.getByText(/last 3 bakes all used quick feeds/)).toBeTruthy();
    });
});

describe('already fed', () => {
    it('plans from a feed in the past and starts with the feed ticked', () => {
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: "I've already fed my starter" }));
        expect(screen.getByText('When did you feed your starter?')).toBeTruthy();
        // the feed ratio cannot change: it has already happened, so the slider only covers that ratio's window
        const wait = screen.getByLabelText(/^Starter feeding time/) as HTMLInputElement;
        expect(Number(wait.max)).toBe(11);
        expect(Number(wait.min)).toBeGreaterThanOrEqual(9);
        fireEvent.click(screen.getByText('Start this plan'));
        const rec = JSON.parse(localStorage.getItem(LIVE_KEY)!).rec;
        expect(rec.actuals.feed).toBe(rec.levers.feedAt);
        expect(rec.levers.feedAt).toBeLessThan(Date.now());
        expect(rec.levers.ratioN).toBe(6);
    });
});

describe('waking hours setting', () => {
    it('is chosen in Settings, remembered, and shown in the wording', () => {
        render(<App />);
        tab('Settings');
        expect(screen.getByText(/between 6:00 am and 11:00 pm/)).toBeTruthy();
        fireEvent.change(screen.getByLabelText(/Up from/), { target: { value: String(7 * 60) } });
        fireEvent.change(screen.getByLabelText(/In bed by/), { target: { value: String(22 * 60) } });
        expect(screen.getByText(/between 7:00 am and 10:00 pm/)).toBeTruthy();
        expect(JSON.parse(localStorage.getItem('loafoclockSettings')!)).toMatchObject({ wakeFrom: 420, wakeTo: 1320 });
    });
});

describe('stopping and removing, without the browser popup', () => {
    it('stopping a bake clears the plan', () => {
        window.confirm = () => false;
        localStorage.setItem(LIVE_KEY, JSON.stringify({ v: 1, rec: lockPlan(leversAt(Date.now() - 3_600_000), 0) }));
        render(<App />);
        fireEvent.click(screen.getByText('Stop this bake'));
        fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Stop this bake'));
        expect(localStorage.getItem(LIVE_KEY)).toBeNull();
        expect(screen.getByText('Start a loaf now')).toBeTruthy();
    });

    it('removing a bake from the log asks first', () => {
        window.confirm = () => false;
        localStorage.setItem(LOG_KEY, JSON.stringify({ v: 1, entries: [{ date: 5, loaves: 1, size: 'regular', notes: 'keep me' }] }));
        render(<App />);
        tab('Log');
        fireEvent.click(screen.getByText('Remove'));
        fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Cancel'));
        expect(loadLog()).toHaveLength(1);
        fireEvent.click(screen.getByText('Remove'));
        fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Remove'));
        expect(loadLog()).toHaveLength(0);
    });
});

describe('footer', () => {
    it('has the Ko-fi link on every page', () => {
        render(<App />);
        for (const name of ['Plan', 'Log', 'Settings', 'Help']) {
            tab(name);
            const link = screen.getByRole('link', { name: 'Tip me on Ko-fi' }) as HTMLAnchorElement;
            expect(link.href).toBe('https://ko-fi.com/fjnine');
            expect(link.rel).toContain('noopener');
        }
        fireEvent.click(screen.getByText("About Loaf O'Clock", { selector: 'button' }));
        expect(screen.getAllByRole('link', { name: 'Tip me on Ko-fi' }).length).toBeGreaterThan(0);
    });
});
