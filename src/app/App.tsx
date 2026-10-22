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
import { FinishForm } from './FinishForm';
import { Help } from './Help';
import { LiveView } from './LiveView';
import { LogScreen } from './LogScreen';
import { Logo } from './Logo';
import { SettingsScreen } from './SettingsScreen';
import { StartNow } from './StartNow';
import { UpdatePrompt } from './UpdatePrompt';

/** Round up to the next 5 minutes so the plan does not change every second. */
const startingPoint = () => Math.ceil(Date.now() / 300_000) * 300_000;

type Mode = 'now' | 'at';
type Tab = 'plan' | 'log' | 'settings' | 'help' | 'about';
const TABS: ReadonlyArray<[Tab, string]> = [['plan', 'Plan'], ['log', 'Log'], ['settings', 'Settings'], ['help', 'Help']];

export function App() {
    const [now] = useState(startingPoint);
    const [mode, setMode] = useState<Mode>('now');
    // Under "Start a loaf now": feed the starter now, or say it was already fed.
    const [alreadyFed, setAlreadyFed] = useState(false);
    const [tab, setTab] = useState<Tab>('plan');
    const [settings, setSettings] = useState<Settings>(() => loadSettings());
    // A saved plan means a bake is under way: go straight back to it.
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

    const update = (rec: LiveRecord) => { saveLive(rec); setLive(rec); };
    const start = (levers: Levers, actuals: Actuals = {}) => update({ ...lockPlan(levers, Date.now()), actuals });
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

    const plan = (
        finishing ? (
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
            <LiveView record={live} onChange={update} onFinish={() => setFinishing(live)} onStop={discard} />
        ) : (
            <>
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
                    ? <BreadAt key={wakeKey} now={now} onStart={start} quickStreak={streak} />
                    : alreadyFed
                        ? <AlreadyFed key={wakeKey} now={now} onStart={start} quickStreak={streak} />
                        : <StartNow key={`${repeat?.key ?? 0}-${wakeKey}`} now={now} onStart={start} quickStreak={streak} base={repeat?.base} />}
            </>
        )
    );

    return (
        <div class="app">
            <header class="app-header">
                <h1>
                    <Logo />
                    Loaf O'Clock
                </h1>
                <p class="tagline">It's always Loaf O'Clock somewhere.</p>
            </header>
            <nav class="tabs" aria-label="Sections">
                {TABS.map(([id, label]) => (
                    <button type="button" class={tab === id || (tab === 'about' && id === 'help') ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>{label}</button>
                ))}
            </nav>
            <main class="app-main">
                {tab === 'plan' && plan}
                {tab === 'log' && (
                    <LogScreen
                        entries={log} oldCount={oldCount} onRepeat={repeatBake}
                        onRemove={(i) => setLog(removeFromLog(i))}
                        onAdd={(entries) => { for (const e of [...entries].reverse()) if (!log.some((l) => l.date === e.date)) addToLog(e); setLog(loadLog().sort((a, b) => b.date - a.date)); }}
                        onImportOld={() => { importOldLog(); setLog(loadLog()); refreshOld(); }}
                    />
                )}
                {tab === 'settings' && <SettingsScreen settings={settings} onChange={change} />}
                {tab === 'help' && <><Help /><p><button type="button" class="link" onClick={() => setTab('about')}>About Loaf O'Clock</button></p></>}
                {tab === 'about' && <About />}
            </main>
            <footer class="app-footer">
                <span>Made by fj9</span>
                <a href="https://ko-fi.com/fjnine" target="_blank" rel="noopener noreferrer">Tip me on Ko-fi</a>
                <button type="button" class="link" onClick={() => setTab('about')}>About</button>
            </footer>
            <UpdatePrompt />
        </div>
    );
}
