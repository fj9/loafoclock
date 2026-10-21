import { useState } from 'preact/hooks';
import { clearLive, loadLive, lockPlan, saveLive, type LiveRecord } from '../domain/liveStore';
import type { Levers } from '../domain/plan';
import { BreadAt } from './BreadAt';
import { LiveView } from './LiveView';
import { Logo } from './Logo';
import { StartNow } from './StartNow';
import { UpdatePrompt } from './UpdatePrompt';

declare const __APP_VERSION__: string;

/** Round up to the next 5 minutes so the plan does not change every second. */
const startingPoint = () => Math.ceil(Date.now() / 300_000) * 300_000;

type Mode = 'now' | 'at';

export function App() {
    const [now] = useState(startingPoint);
    const [mode, setMode] = useState<Mode>('now');
    // A saved plan means a bake is under way: go straight back to it.
    const [live, setLive] = useState<LiveRecord | null>(() => loadLive());

    const update = (rec: LiveRecord) => { saveLive(rec); setLive(rec); };
    const start = (levers: Levers) => update(lockPlan(levers, Date.now()));
    const finish = () => { clearLive(); setLive(null); };

    return (
        <div class="app">
            <header class="app-header">
                <h1>
                    <Logo />
                    Loaf O'Clock
                </h1>
                <p class="tagline">It's always Loaf O'Clock somewhere.</p>
            </header>
            <main class="app-main">
                {live ? (
                    <LiveView record={live} onChange={update} onFinish={finish} />
                ) : (
                    <>
                        <div class="seg-choice mode" role="group" aria-label="How do you want to plan?">
                            <button type="button" class={mode === 'now' ? 'on' : ''} aria-pressed={mode === 'now'} onClick={() => setMode('now')}>Start a loaf now</button>
                            <button type="button" class={mode === 'at' ? 'on' : ''} aria-pressed={mode === 'at'} onClick={() => setMode('at')}>I want bread at…</button>
                        </div>
                        {mode === 'now' ? <StartNow now={now} onStart={start} /> : <BreadAt now={now} onStart={start} />}
                    </>
                )}
                <p class="hint">Version {__APP_VERSION__} (work in progress)</p>
            </main>
            <UpdatePrompt />
        </div>
    );
}
