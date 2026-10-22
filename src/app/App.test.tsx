// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { LOG_KEY, loadLog } from '../domain/bakeLog';
import { LIVE_KEY, lockPlan } from '../domain/liveStore';
import { STEP_ORDER, buildPlan, leversAt, setWaking } from '../domain/plan';

beforeEach(() => { setWaking(); localStorage.clear(); document.documentElement.removeAttribute('data-theme'); });
afterEach(cleanup);

const tab = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
/** Settings, Help and About are in the menu at the top right. */
const menu = (name: string) => { fireEvent.click(screen.getByRole('button', { name: 'Menu' })); fireEvent.click(screen.getByRole('menuitem', { name })); };

describe('App shell', () => {
    it('shows the name and the tagline', () => {
        render(<App />);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toContain("Loaf O'Clock");
        expect(screen.getByText("It's always Loaf O'Clock somewhere.")).toBeTruthy();
    });

    it('moves between the sections', () => {
        render(<App />);
        tab('Log');
        expect(screen.getByRole('heading', { name: 'No bakes yet' })).toBeTruthy();
        expect(screen.getByText('When you finish a bake you can log how it went here.')).toBeTruthy();
        tab('Bake');
        expect(screen.getByText('No bake running')).toBeTruthy();
        menu('Help');
        expect(screen.getByText('Keeping a healthy starter')).toBeTruthy();
        menu('About');
        expect(screen.getByText('Why I made it')).toBeTruthy();
        tab('Plan');
        expect(screen.getByText('Start a loaf now')).toBeTruthy();
    });

    it('settings change the theme and the clock, and are remembered', () => {
        render(<App />);
        menu('Settings');
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
        menu('Settings');
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
        expect(screen.getByText('No bake running')).toBeTruthy();
    });

    it('Remove is a red button like Stop this bake, and its confirm is red', () => {
        localStorage.setItem(LOG_KEY, JSON.stringify({ v: 1, entries: [{ date: 5, loaves: 1, size: 'regular', notes: '' }] }));
        render(<App />);
        tab('Log');
        const remove = screen.getByRole('button', { name: 'Remove' });
        expect(remove.className).toContain('danger');
        fireEvent.click(remove);
        expect(within(screen.getByRole('alertdialog')).getByText('Remove', { selector: 'button' }).className).toContain('danger-fill');
        expect(screen.getByRole('heading', { name: /^Sat 01 Jan 1970|1970/ })).toBeTruthy();
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
        for (const name of ['Plan', 'Bake', 'Log']) {
            tab(new RegExp(`^${name}`));
            const link = screen.getByRole('link', { name: 'Tip me on Ko-fi' }) as HTMLAnchorElement;
            expect(link.href).toBe('https://ko-fi.com/fjnine');
            expect(link.rel).toContain('noopener');
        }
        for (const name of ['Settings', 'Help', 'About']) {
            menu(name);
            expect(screen.getByRole('link', { name: 'Tip me on Ko-fi' })).toBeTruthy();
        }
    });
});

describe('tabs, the menu and the bake', () => {
    const plant = () => localStorage.setItem(LIVE_KEY, JSON.stringify({ v: 1, rec: lockPlan(leversAt(Date.now() - 3_600_000), 0) }));

    it('has Plan, Bake and Log as tabs, with Settings, Help and About in the menu', () => {
        render(<App />);
        expect(screen.getAllByRole('navigation', { name: 'Sections' })[0]!.textContent).toMatch(/^PlanBakeLog$/);
        expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
        expect(screen.getAllByRole('menuitem').map((e) => e.textContent)).toEqual(['Settings', 'Help', 'About']);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();
    });

    it('opens on the bake when one is running, and marks the tab', () => {
        plant();
        render(<App />);
        expect(screen.getByRole('region', { name: 'Next up' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /^Bake \(in progress\)/ }).getAttribute('aria-current')).toBe('page');
        tab('Plan');
        expect(screen.getByText(/You have a bake in progress/)).toBeTruthy();
        fireEvent.click(screen.getByText('Go to Bake'));
        expect(screen.getByRole('region', { name: 'Next up' })).toBeTruthy();
    });

    it('starting a plan opens the Bake tab', () => {
        render(<App />);
        fireEvent.click(screen.getByText('Start this plan'));
        expect(screen.getByRole('region', { name: 'Next up' })).toBeTruthy();
        expect(localStorage.getItem(LIVE_KEY)).not.toBeNull();
    });

    it('starts each section at the top of the page', () => {
        const scrolled: number[] = [];
        window.scrollTo = ((o: ScrollToOptions) => { scrolled.push(o.top ?? -1); }) as typeof window.scrollTo;
        render(<App />);
        scrolled.length = 0;
        fireEvent.click(screen.getByText('Start this plan'));
        expect(screen.getByRole('region', { name: 'Next up' })).toBeTruthy();
        expect(scrolled).toEqual([0]);
        tab('Log');
        expect(scrolled).toEqual([0, 0]);
    });

    it('the headings say what they are: planned steps on Plan, your progress on Bake', () => {
        plant();
        render(<App />);
        expect(screen.getByRole('heading', { name: 'Your progress' })).toBeTruthy();
        tab('Plan');
        expect(screen.getByRole('heading', { name: 'Planned steps' })).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'The steps' })).toBeNull();
    });

    it('asks before a new plan replaces the bake in progress', () => {
        plant();
        render(<App />);
        tab('Plan');
        const before = localStorage.getItem(LIVE_KEY);
        fireEvent.click(screen.getByText('Start this plan'));
        const dialog = screen.getByRole('alertdialog', { name: 'Replace your current bake?' });
        fireEvent.click(within(dialog).getByText('Cancel'));
        expect(localStorage.getItem(LIVE_KEY)).toBe(before);
        fireEvent.click(screen.getByText('Start this plan'));
        const confirm = within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Replace bake' });
        expect(confirm.className).toContain('danger-fill'); // red, and it says what is lost
        fireEvent.click(confirm);
        expect(localStorage.getItem(LIVE_KEY)).not.toBe(before);
        expect(screen.getByRole('region', { name: 'Next up' })).toBeTruthy();
    });

    it('the bake tab has no reminders button; the plan page does', () => {
        plant();
        render(<App />);
        expect(screen.queryByText('Add reminders to my calendar')).toBeNull();
        tab('Plan');
        expect(screen.getByText('Add reminders to my calendar')).toBeTruthy();
    });
});

describe('actions and links', () => {
    it('Add reminders to my calendar is an outline button under Start this plan', () => {
        render(<App />);
        const b = screen.getByRole('button', { name: 'Add reminders to my calendar' });
        expect(b.className).toContain('outline');
        expect(b.closest('.reminders')?.previousElementSibling?.textContent).toBe('Start this plan');
    });

    it('adding the first app\'s bakes is an outline button', () => {
        localStorage.setItem('sourdoughLogs', JSON.stringify([{ date: '2026-05-01T10:00:00.000Z', loaves: 1, size: 'regular', notes: '' }]));
        render(<App />);
        tab('Log');
        expect(screen.getByRole('button', { name: 'Add them to this log' }).className).toContain('outline');
    });

    it('About is in the menu and the footer, not also on the Help page', () => {
        render(<App />);
        menu('Help');
        expect(screen.queryByText("About Loaf O'Clock")).toBeNull();
        menu('About');
        expect(screen.getByText('Why I made it')).toBeTruthy();
    });
});

describe('time fields follow the Clock setting', () => {
    it('no screen uses the phone\'s own time box', () => {
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: "I've already fed my starter" }));
        expect(document.querySelector('input[type="time"]')).toBeNull();
        expect(screen.getByLabelText('Hour')).toBeTruthy();
    });

    it('the already-fed time shows am/pm with the 12-hour setting, and not with the 24-hour one', () => {
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: "I've already fed my starter" }));
        expect(screen.getByLabelText('am or pm')).toBeTruthy(); // 12-hour is the default
        menu('Settings');
        fireEvent.click(screen.getByText('19:30'));
        tab('Plan');
        expect(screen.queryByLabelText('am or pm')).toBeNull();
    });
});

describe('button pairs: the safe action first, the primary or destructive one after', () => {
    /** The labels of the buttons in the row that holds `name`, in screen order. */
    const rowOf = (name: string | RegExp, root: ParentNode = document) => {
        const b = [...root.querySelectorAll('button')].find((x) => (typeof name === 'string' ? x.textContent === name : name.test(x.textContent ?? '')))!;
        return [...b.parentElement!.querySelectorAll('button')].map((x) => x.textContent!);
    };

    it('Skip the log comes before Save to the log, and both are buttons', () => {
        const levers = leversAt(Date.now() - 40 * 3_600_000, { fridge: { kind: 'hours', hours: 12 } });
        const plan = buildPlan(levers);
        const actuals = Object.fromEntries(STEP_ORDER.filter((id) => id !== 'carve').map((id) => [id, plan.byId[id]]));
        localStorage.setItem(LIVE_KEY, JSON.stringify({ v: 1, rec: { ...lockPlan(levers, 0), actuals } }));
        render(<App />);
        fireEvent.click(screen.getByText('Finish this bake'));
        expect(rowOf('Skip the log')).toEqual(['Skip the log', 'Save to the log']);
        expect(screen.getByRole('button', { name: 'Skip the log' }).className).toContain('outline');
    });

    it('Cancel comes before the confirm button on every confirmation', () => {
        localStorage.setItem(LIVE_KEY, JSON.stringify({ v: 1, rec: lockPlan(leversAt(Date.now() - 3_600_000), 0) }));
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'Stop this bake' }));
        expect(rowOf('Cancel', screen.getByRole('alertdialog'))).toEqual(['Cancel', 'Stop this bake']);
    });

    it('in the Change the plan and Stop this bake row, the red one is on the right', () => {
        localStorage.setItem(LIVE_KEY, JSON.stringify({ v: 1, rec: lockPlan(leversAt(Date.now() - 3_600_000), 0) }));
        render(<App />);
        expect(rowOf('Change the plan')).toEqual(['Change the plan', 'Stop this bake']);
    });

    it('the time picker has Cancel before Save', () => {
        localStorage.setItem(LIVE_KEY, JSON.stringify({ v: 1, rec: lockPlan(leversAt(Date.now() - 3_600_000), 0) }));
        render(<App />);
        fireEvent.click(screen.getByRole('button', { name: 'Done earlier' }));
        const order = rowOf('Cancel', screen.getByRole('group', { name: 'Done earlier' }));
        expect(order[0]).toBe('Cancel');
        expect(order[1]).toMatch(/^Save /);
    });
});

describe('page titles match their tabs', () => {
    it('the Log tab has a Log heading, and the Plan tab has no page heading', () => {
        render(<App />);
        expect(screen.queryByRole('heading', { level: 2, name: 'Plan' })).toBeNull();
        tab('Log');
        expect(screen.getByRole('heading', { level: 2, name: 'Log' })).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'Your bakes' })).toBeNull();
    });
});

describe('empty states look the same', () => {
    const empty = () => document.querySelector('.empty-state')!;

    it('the empty Log has a heading, one sentence and a button to plan a loaf', () => {
        render(<App />);
        tab('Log');
        expect(empty().querySelector('h2')!.textContent).toBe('No bakes yet');
        expect(empty().querySelectorAll('p')).toHaveLength(1);
        fireEvent.click(within(empty() as HTMLElement).getByRole('button', { name: 'Plan a loaf' }));
        expect(screen.getByText('Start a loaf now')).toBeTruthy(); // now on the Plan tab
    });

    it('the empty Bake tab uses the same pattern', () => {
        render(<App />);
        tab('Bake');
        expect(empty().querySelector('h2')!.textContent).toBe('No bake running');
        expect(empty().querySelectorAll('p')).toHaveLength(1);
        expect(empty().querySelector('button')!.textContent).toBe('Plan a loaf');
    });

    it('"I want bread at…" with no plan that fits uses it too, announced as a status, with no button', () => {
        render(<App />);
        fireEvent.click(screen.getByText('I want bread at…'));
        fireEvent.click(screen.getByText('Today'));
        const status = screen.getByRole('status');
        expect(status.className).toContain('empty-state');
        expect(status.querySelector('h2')!.textContent).toBe('No plan fits that time');
        expect(status.querySelector('button')).toBeNull();
    });
});
