import { useEffect, useState } from 'preact/hooks';
import { addToLog, importOldLog, loadLog, oldLogEntries, quickFeedStreak, removeFromLog, type LogEntry } from '../domain/bakeLog';
import { setClock12 } from '../domain/clock';
import { setWaking } from '../domain/plan';
import { clearLive, loadLive, lockPlan, saveLive, type LiveRecord } from '../domain/liveStore';
import { buildPlan, type Actuals, type Levers } from '../domain/plan';
import { applyDisplaySettings, applyTheme, loadSettings, saveSettings, wakingFromSettings, type Settings } from '../domain/settings';
import { About } from './About';
import { AlreadyFed } from './AlreadyFed';
import { BreadAt } from './BreadAt';
import { ConfirmSheet } from './ConfirmSheet';
import { EmptyState } from './EmptyState';
import { FinishForm } from './FinishForm';
import { Help } from './Help';
import { LiveView } from './LiveView';
import { LogScreen } from './LogScreen';
import { Logo } from './Logo';
import { SettingsScreen } from './SettingsScreen';
import type { Layout } from './PlanView';
import { StartNow } from './StartNow';
import { UpdatePrompt } from './UpdatePrompt';

/** Round up to the next 5 minutes so the plan does not change every second. */
const startingPoint = () => Math.ceil(Date.now() / 300_000) * 300_000;

type Mode = 'now' | 'at';
type Tab = 'plan' | 'plan2' | 'bake' | 'bake2' | 'log' | 'settings' | 'help' | 'about';
const TABS: ReadonlyArray<[Tab, string]> = [['plan', 'Plan'], ['plan2', 'New plan'], ['bake', 'Bake'], ['bake2', 'New bake'], ['log', 'Log']];
/** The rest live in the menu at the top right. */
const MENU: ReadonlyArray<[Tab, string]> = [['settings', 'Settings'], ['help', 'Help'], ['about', 'About']];

export function App() {
    const [now] = useState(startingPoint);
    const [mode, setMode] = useState<Mode>('now');
    // Under "Start a loaf now": feed the starter now, or say it was already fed.
    const [alreadyFed, setAlreadyFed] = useState(false);
    // A saved plan means a bake is under way, so open on it.
    const [tab, setTab] = useState<Tab>(() => (loadLive() ? 'bake' : 'plan'));
    const [menuOpen, setMenuOpen] = useState(false);
    // A plan waiting for you to confirm that it replaces the bake in progress.
    const [replacing, setReplacing] = useState<{ levers: Levers; actuals: Actuals; layout: Layout } | null>(null);
    const [settings, setSettings] = useState<Settings>(() => loadSettings());
    const [live, setLive] = useState<LiveRecord | null>(() => loadLive());
    const [finishing, setFinishing] = useState<LiveRecord | null>(null);
    const [log, setLog] = useState<LogEntry[]>(() => loadLog());
    const [oldCount, setOldCount] = useState(() => oldLogEntries().filter((o) => !loadLog().some((e) => e.date === o.date)).length);
    const [repeat, setRepeat] = useState<{ key: number; base: Partial<Levers> } | null>(null);

    // Display settings apply to the whole page; they are set again whenever they change.
    setClock12(settings.clock12 !== false);
    const waking = wakingFromSettings(settings);
    setWaking(waking);
    const wakeKey = `${waking.fromMin}-${waking.toMin}`; // plans are worked out again when this changes
    useEffect(() => { applyTheme(settings); applyDisplaySettings(settings); }, [settings]);
    const change = (patch: Settings) => { saveSettings(patch); setSettings((s) => ({ ...s, ...patch })); };

    // A new section starts at the top, not wherever the last one was scrolled to.
    useEffect(() => { try { window.scrollTo({ top: 0 }); } catch { /* no scrolling here */ } }, [tab]);
    useEffect(() => {
        if (!menuOpen) return;
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('keydown', esc);
        return () => document.removeEventListener('keydown', esc);
    }, [menuOpen]);
    const go = (t: Tab) => { setTab(t); setMenuOpen(false); };

    const update = (rec: LiveRecord) => { saveLive(rec); setLive(rec); };
    // A plan started from the New plan tab opens the New bake tab, and one from the classic Plan opens the classic Bake.
    const begin = (levers: Levers, actuals: Actuals, layout: Layout) => { update({ ...lockPlan(levers, Date.now()), actuals }); setTab(layout === 'rail' ? 'bake2' : 'bake'); };
    const start = (levers: Levers, actuals: Actuals = {}, layout: Layout = 'classic') => (live ? setReplacing({ levers, actuals, layout }) : begin(levers, actuals, layout));
    const discard = () => { clearLive(); setLive(null); setFinishing(null); };
    const saveEntry = (entry: LogEntry) => { setLog(addToLog(entry)); discard(); setTab('log'); };

    const refreshOld = () => setOldCount(oldLogEntries().filter((o) => !loadLog().some((e) => e.date === o.date)).length);
    const repeatBake = (e: LogEntry) => {
        setRepeat({ key: Date.now(), base: { loaves: e.loaves === 2 ? 2 : 1, size: e.size === 'large' ? 'large' : 'regular', ...(e.hydration ? { hydration: e.hydration } : {}), ...(e.doughTemp ? { doughTemp: e.doughTemp } : {}) } });
        setMode('now');
        setAlreadyFed(false);
        setTab('plan');
    };
    const streak = quickFeedStreak(log);

    const bakePage = (layout: Layout) => finishing ? (
        <FinishForm
            entry={(() => {
                const p = buildPlan(finishing.levers, finishing.actuals);
                return {
                    date: Date.now(), loaves: finishing.levers.loaves ?? 1, size: finishing.levers.size,
                    ...(finishing.levers.hydration ? { hydration: finishing.levers.hydration } : {}),
                    ratioN: finishing.levers.ratioN, doughTemp: finishing.levers.doughTemp,
                    ...(p.fridgeHours ? { fridgeHours: Math.round(p.fridgeHours * 100) / 100 } : {})
                };
            })()}
            onSave={saveEntry} onSkip={discard}
        />
    ) : live ? (
        <LiveView record={live} onChange={update} onFinish={() => setFinishing(live)} onStop={discard} layout={layout} />
    ) : (
        <EmptyState title="No bake running" action={{ label: 'Plan a loaf', onClick: () => setTab(layout === 'rail' ? 'plan2' : 'plan') }}>
            Plan a loaf and press Start this plan. It will show up here, with what to do next and how long you are free.
        </EmptyState>
    );

    // The classic Plan page and the New plan page share everything but the layout of the plan itself.
    const planPage = (layout: Layout) => (
        <>
            {layout === 'rail' && (
                <p class="hint np-note">
                    A new layout we are trying: the answer stays pinned as you change things, and the steps run down a timeline.
                    {' '}<button type="button" class="link" onClick={() => setTab('plan')}>Back to the classic Plan</button>
                </p>
            )}
            {live && (
                <p class="panel bake-banner" role="status">
                    You have a bake in progress. <button type="button" class="link" onClick={() => setTab(layout === 'rail' ? 'bake2' : 'bake')}>Go to Bake</button>
                </p>
            )}
            <div class="seg-choice mode" role="group" aria-label="How do you want to plan?">
                <button type="button" class={mode === 'now' ? 'on' : ''} aria-pressed={mode === 'now'} onClick={() => setMode('now')}>Start a loaf now</button>
                <button type="button" class={mode === 'at' ? 'on' : ''} aria-pressed={mode === 'at'} onClick={() => setMode('at')}>I want bread at…</button>
            </div>
            {mode === 'now' && (
                <div class="seg-choice mode" role="group" aria-label="Your starter">
                    <button type="button" class={!alreadyFed ? 'on' : ''} aria-pressed={!alreadyFed} onClick={() => setAlreadyFed(false)}>Feed it now</button>
                    <button type="button" class={alreadyFed ? 'on' : ''} aria-pressed={alreadyFed} onClick={() => setAlreadyFed(true)}>I've already fed my starter</button>
                </div>
            )}
            {mode === 'at'
                ? <BreadAt key={wakeKey} now={now} onStart={(l) => start(l, {}, layout)} quickStreak={streak} layout={layout} />
                : alreadyFed
                    ? <AlreadyFed key={wakeKey} now={now} onStart={(l, a) => start(l, a, layout)} quickStreak={streak} layout={layout} />
                    : <StartNow key={`${repeat?.key ?? 0}-${wakeKey}`} now={now} onStart={(l) => start(l, {}, layout)} quickStreak={streak} base={repeat?.base} layout={layout} />}
        </>
    );

    return (
        <div class="app">
            <header class="app-header">
                <button type="button" class="menu-btn" aria-label="Menu" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none" /></svg>
                </button>
                {menuOpen && (
                    <>
                        <div class="menu-scrim" onClick={() => setMenuOpen(false)} />
                        <ul class="menu" role="menu" aria-label="Menu">
                            {MENU.map(([id, label]) => (
                                <li role="none"><button type="button" role="menuitem" class={tab === id ? 'on' : ''} onClick={() => go(id)}>{label}</button></li>
                            ))}
                        </ul>
                    </>
                )}
                <h1>
                    <Logo />
                    Loaf O'Clock
                </h1>
                <p class="tagline">It's always Loaf O'Clock somewhere.</p>
            </header>
            <nav class="tabs" aria-label="Sections">
                {TABS.map(([id, label]) => (
                    <button type="button" class={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
                        {label}
                        {(id === 'bake' || id === 'bake2') && live && <><span class="dot" aria-hidden="true" />{' '}<span class="sr-only">(in progress)</span></>}
                    </button>
                ))}
            </nav>
            <main class={`app-main${tab === 'plan2' || tab === 'bake2' ? '' : ' narrow'}`}>
                {tab === 'plan' && planPage('classic')}
                {tab === 'plan2' && planPage('rail')}
                {tab === 'bake' && bakePage('classic')}
                {tab === 'bake2' && bakePage('rail')}
                {tab === 'log' && (
                    <LogScreen
                        entries={log} oldCount={oldCount} onRepeat={repeatBake} onPlan={() => setTab('plan')}
                        onRemove={(i) => setLog(removeFromLog(i))}
                        onAdd={(entries) => { for (const e of [...entries].reverse()) if (!log.some((l) => l.date === e.date)) addToLog(e); setLog(loadLog().sort((a, b) => b.date - a.date)); }}
                        onImportOld={() => { importOldLog(); setLog(loadLog()); refreshOld(); }}
                    />
                )}
                {tab === 'settings' && <SettingsScreen settings={settings} onChange={change} />}
                {tab === 'help' && <Help />}
                {tab === 'about' && <About />}
            </main>
            <footer class="app-footer">
                <span>Made by fj9</span>
                <a href="https://ko-fi.com/fjnine" target="_blank" rel="noopener noreferrer">Tip me on Ko-fi</a>
                <button type="button" class="link" onClick={() => setTab('about')}>About</button>
            </footer>
            {replacing && (
                <ConfirmSheet
                    title="Replace your current bake?" body="You already have a bake in progress. Replacing it throws that one away."
                    confirmLabel="Replace bake" danger onCancel={() => setReplacing(null)}
                    onConfirm={() => { begin(replacing.levers, replacing.actuals, replacing.layout); setReplacing(null); }}
                />
            )}
            <UpdatePrompt />
        </div>
    );
}
