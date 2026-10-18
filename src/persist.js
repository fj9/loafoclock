// Saving the bake in progress, so a reload or a locked phone doesn't lose it.
export const BAKE_KEY = 'sourdoughActiveBake';
const VERSION = 1;

export function saveActiveBake(bake, storage = globalThis.localStorage, now = Date.now()) {
    try { storage.setItem(BAKE_KEY, JSON.stringify({ v: VERSION, savedAt: now, bake })); } catch (e) { /* private mode */ }
}

export function clearActiveBake(storage = globalThis.localStorage) {
    try { storage.removeItem(BAKE_KEY); } catch (e) { /* ignore */ }
}

/** The saved bake, or null if there is none or it does not look right. */
export function loadActiveBake(totalSteps, storage = globalThis.localStorage) {
    try {
        const saved = JSON.parse(storage.getItem(BAKE_KEY) || 'null');
        const b = saved?.bake;
        if (saved?.v !== VERSION || !b || typeof b !== 'object') return null;
        if (!Number.isInteger(b.currentStep) || b.currentStep < 0 || b.currentStep >= totalSteps) return null;
        if (!(b.loaves >= 1)) return null;
        return { bake: b, savedAt: Number(saved.savedAt) || 0 };
    } catch (e) {
        return null;
    }
}

/** "3 hours ago", "yesterday"... in plain words. */
export function savedAgo(savedAt, now = Date.now()) {
    const mins = Math.max(0, Math.round((now - savedAt) / 60000));
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
}

// ---- Timer, stored with the bake so it keeps going while the screen is off ----
/** What the timer should show now: seconds left, whether it is running, and whether it ran out while away. */
export function timerNow(timer, now = Date.now()) {
    if (!timer) return null;
    if (!timer.running) return { seconds: Math.max(0, Math.round(timer.remaining)), running: false, finished: false };
    const seconds = Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
    return { seconds, running: seconds > 0, finished: seconds === 0 };
}
export const startedTimer = (remainingSeconds, step, now = Date.now()) =>
    ({ step, running: true, endsAt: now + remainingSeconds * 1000, remaining: remainingSeconds });
export const pausedTimer = (timer, step, now = Date.now()) =>
    ({ step, running: false, endsAt: null, remaining: timerNow(timer, now)?.seconds ?? 0 });
