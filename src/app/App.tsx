import { useState } from 'preact/hooks';
import { Logo } from './Logo';
import { StartNow } from './StartNow';
import { UpdatePrompt } from './UpdatePrompt';

declare const __APP_VERSION__: string;

/** Round up to the next 5 minutes so the plan does not change every second. */
const startingPoint = () => Math.ceil(Date.now() / 300_000) * 300_000;

export function App() {
    const [now] = useState(startingPoint);
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
                <h2>Start a loaf now</h2>
                <StartNow now={now} />
                <p class="hint">Version {__APP_VERSION__} (work in progress)</p>
            </main>
            <UpdatePrompt />
        </div>
    );
}
