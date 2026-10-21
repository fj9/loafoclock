import { Logo } from './Logo';
import { UpdatePrompt } from './UpdatePrompt';

declare const __APP_VERSION__: string;

/** Placeholder shell for milestone 0. The timeline-first screens arrive in milestones 2 to 4. */
export function App() {
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
                <section class="panel">
                    <h2>The new version is on its way</h2>
                    <p>A multi-day timeline from your first feed to a loaf that's ready to carve, with levers you can pull to fit it around your day.</p>
                    <p class="hint">Version {__APP_VERSION__} (work in progress)</p>
                </section>
            </main>
            <UpdatePrompt />
        </div>
    );
}
