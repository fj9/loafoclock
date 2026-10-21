import { useRegisterSW } from 'virtual:pwa-register/preact';

/** Asks the person to reload when a new version of the app has been downloaded in the background. */
export function UpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker
    } = useRegisterSW();

    if (!needRefresh) return null;
    return (
        <div class="overlay" role="alertdialog" aria-label="Update available">
            <div class="sheet">
                <h2>A new version is ready</h2>
                <p>Reload to get the latest fixes. Your saved plan and log are kept.</p>
                <div class="btn-row">
                    <button type="button" class="btn outline" onClick={() => setNeedRefresh(false)}>Later</button>
                    <button type="button" class="btn" onClick={() => void updateServiceWorker(true)}>Reload</button>
                </div>
            </div>
        </div>
    );
}
