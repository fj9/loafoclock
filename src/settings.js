// Things the app remembers between visits, kept in the browser's local storage.
const SETTINGS_KEY = 'sourdoughSettings';

export const TEXT_SIZES = ['normal', 'large', 'larger'];

export function loadSettings(storage = globalThis.localStorage) {
    try { return JSON.parse(storage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (e) { return {}; }
}

export function saveSettings(patch, storage = globalThis.localStorage) {
    try { storage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(storage), ...patch })); } catch (e) { /* private mode */ }
}

/** Applies the display settings (hints on/off, text size) to the page. */
export function applyDisplaySettings(settings, root = globalThis.document?.documentElement) {
    if (!root) return;
    root.dataset.hints = settings.hints === false ? 'off' : 'on';
    root.dataset.text = TEXT_SIZES.includes(settings.textSize) ? settings.textSize : 'normal';
}

/** The loaf and feed choices to start from next time. */
export function rememberChoices(bake, storage = globalThis.localStorage) {
    saveSettings({
        lastBake: {
            loaves: bake.loaves, size: bake.size, hydration: bake.hydration,
            feedMode: bake.feedMode, feedHave: bake.feedHave
        }
    }, storage);
}
