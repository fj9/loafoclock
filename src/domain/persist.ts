// Saving the bake in progress, so a reload or a locked phone doesn't lose it.
// Keys start with "loafoclock" so they never read another app's data on the same site.
// The saved record's shape will change with the new plan model (milestones 1 and 4).
import type { StorageLike } from './settings';

export const BAKE_KEY = 'loafoclockActiveBake';
const VERSION = 1;

export function saveActiveBake(bake: unknown, storage: StorageLike = globalThis.localStorage, now: number = Date.now()): void {
    try {
        storage.setItem(BAKE_KEY, JSON.stringify({ v: VERSION, savedAt: now, bake }));
    } catch {
        /* private mode */
    }
}

export function clearActiveBake(storage: StorageLike = globalThis.localStorage): void {
    try {
        storage.removeItem(BAKE_KEY);
    } catch {
        /* ignore */
    }
}

export interface SavedBake<T> {
    bake: T;
    savedAt: number;
}

/** The saved bake, or null if there is none or it does not look right. */
export function loadActiveBake<T extends { currentStep: number; loaves: number }>(
    totalSteps: number,
    storage: StorageLike = globalThis.localStorage
): SavedBake<T> | null {
    try {
        const saved = JSON.parse(storage.getItem(BAKE_KEY) || 'null');
        const b = saved?.bake;
        if (saved?.v !== VERSION || !b || typeof b !== 'object') return null;
        if (!Number.isInteger(b.currentStep) || b.currentStep < 0 || b.currentStep >= totalSteps) return null;
        if (!(b.loaves >= 1)) return null;
        return { bake: b as T, savedAt: Number(saved.savedAt) || 0 };
    } catch {
        return null;
    }
}

/** "3 hours ago", "yesterday"... in plain words. */
export function savedAgo(savedAt: number, now: number = Date.now()): string {
    const mins = Math.max(0, Math.round((now - savedAt) / 60000));
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'yesterday' : `${days} days ago`;
}

// ---- Timer, stored with the bake so it keeps going while the screen is off ----
export interface TimerState {
    step: number;
    running: boolean;
    endsAt: number | null;
    remaining: number;
}

export interface TimerNow {
    seconds: number;
    running: boolean;
    finished: boolean;
}

/** What the timer should show now: seconds left, whether it is running, and whether it ran out while away. */
export function timerNow(timer: TimerState | null | undefined, now: number = Date.now()): TimerNow | null {
    if (!timer) return null;
    if (!timer.running) return { seconds: Math.max(0, Math.round(timer.remaining)), running: false, finished: false };
    const seconds = Math.max(0, Math.ceil(((timer.endsAt ?? now) - now) / 1000));
    return { seconds, running: seconds > 0, finished: seconds === 0 };
}

export const startedTimer = (remainingSeconds: number, step: number, now: number = Date.now()): TimerState =>
    ({ step, running: true, endsAt: now + remainingSeconds * 1000, remaining: remainingSeconds });

export const pausedTimer = (timer: TimerState | null | undefined, step: number, now: number = Date.now()): TimerState =>
    ({ step, running: false, endsAt: null, remaining: timerNow(timer, now)?.seconds ?? 0 });
