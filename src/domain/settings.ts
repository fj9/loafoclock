// Things the app remembers between visits, kept in the browser's local storage.
// Keys start with "loafoclock" so they never read another app's data on the same site.
const SETTINGS_KEY = 'loafoclockSettings';

export const TEXT_SIZES = ['normal', 'large', 'larger'] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface Settings {
    hints?: boolean;
    textSize?: TextSize;
    clock12?: boolean;
    theme?: Theme;
    welcomeSeen?: boolean;
    [key: string]: unknown;
}

export function loadSettings(storage: StorageLike = globalThis.localStorage): Settings {
    try {
        return JSON.parse(storage.getItem(SETTINGS_KEY) || '{}') || {};
    } catch {
        return {};
    }
}

export function saveSettings(patch: Settings, storage: StorageLike = globalThis.localStorage): void {
    try {
        storage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(storage), ...patch }));
    } catch {
        /* private mode */
    }
}

/** Applies the display settings (hints on/off, text size) to the page. */
export function applyDisplaySettings(settings: Settings, root: { dataset: DOMStringMap } | undefined = globalThis.document?.documentElement): void {
    if (!root) return;
    root.dataset.hints = settings.hints === false ? 'off' : 'on';
    root.dataset.text = TEXT_SIZES.includes(settings.textSize as TextSize) ? settings.textSize : 'normal';
}

/** Applies the light or dark choice. "system" follows the phone. */
export function applyTheme(settings: Settings, root: { setAttribute(k: string, v: string): void; removeAttribute(k: string): void } | undefined = globalThis.document?.documentElement): void {
    if (!root) return;
    if (settings.theme === 'light' || settings.theme === 'dark') root.setAttribute('data-theme', settings.theme);
    else root.removeAttribute('data-theme');
}
