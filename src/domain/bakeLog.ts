// The log of finished bakes, kept on this device. Keys start with "loafoclock" so they never
// read another app's data on the same site (the first app used "sourdoughLogs": see importOldLog).
import { QUICK_FEED_MAX_N } from './plan';
import type { StorageLike } from './settings';

export const LOG_KEY = 'loafoclockLog';
const OLD_LOG_KEY = 'sourdoughLogs';
const VERSION = 1;

export const OUTCOMES = ['Excellent', 'Good', 'Fair', 'Poor'] as const;
export type Outcome = (typeof OUTCOMES)[number];

export interface LogEntry {
    /** When it was logged (ms since 1970). */
    date: number;
    loaves: number;
    size: string;
    hydration?: number;
    /** The feed was 1:N:N. Not known for bakes imported from the first app. */
    ratioN?: number;
    doughTemp?: number;
    fridgeHours?: number;
    outcome?: Outcome;
    notes: string;
}

export function loadLog(storage: StorageLike = globalThis.localStorage): LogEntry[] {
    try {
        const saved = JSON.parse(storage.getItem(LOG_KEY) || 'null');
        if (saved?.v !== VERSION || !Array.isArray(saved.entries)) return [];
        return saved.entries.filter(isEntry);
    } catch {
        return [];
    }
}

function write(entries: LogEntry[], storage: StorageLike): void {
    try {
        storage.setItem(LOG_KEY, JSON.stringify({ v: VERSION, entries }));
    } catch {
        /* private mode */
    }
}

/** Adds a bake, newest first. */
export function addToLog(entry: LogEntry, storage: StorageLike = globalThis.localStorage): LogEntry[] {
    const entries = [entry, ...loadLog(storage)];
    write(entries, storage);
    return entries;
}

export function removeFromLog(index: number, storage: StorageLike = globalThis.localStorage): LogEntry[] {
    const entries = loadLog(storage).filter((_, i) => i !== index);
    write(entries, storage);
    return entries;
}

const isEntry = (e: unknown): e is LogEntry => {
    const x = e as LogEntry | null;
    return !!x && Number.isFinite(x.date) && x.loaves >= 1 && typeof x.size === 'string' && typeof x.notes === 'string' &&
        (x.outcome === undefined || (OUTCOMES as readonly string[]).includes(x.outcome));
};

/** How many of the most recent bakes in a row used a quick feed (1:3:3 or quicker). */
export function quickFeedStreak(entries: LogEntry[]): number {
    let n = 0;
    for (const e of entries) {
        if (e.ratioN === undefined || e.ratioN > QUICK_FEED_MAX_N) break;
        n++;
    }
    return n;
}

/** Nudge about keeping the starter steady after this many quick feeds in a row. */
export const QUICK_FEED_NUDGE_AT = 3;

// ---- Backup and restore ----
export const exportLog = (entries: LogEntry[]): string => JSON.stringify({ v: VERSION, entries }, null, 2);

/** Entries from a backup file, or null if the file is not a backup. */
export function parseBackup(text: string): LogEntry[] | null {
    try {
        const saved = JSON.parse(text);
        if (saved?.v !== VERSION || !Array.isArray(saved.entries)) return null;
        return saved.entries.filter(isEntry);
    } catch {
        return null;
    }
}

// ---- The first app's log ----
interface OldEntry { date?: string; loaves?: number; size?: string; hydration?: number; outcome?: string; notes?: string; temperature?: string | number }

/** Bakes saved by the first app on this site, in the new shape. Nothing is changed or removed there. */
export function oldLogEntries(storage: StorageLike = globalThis.localStorage): LogEntry[] {
    try {
        const old: OldEntry[] = JSON.parse(storage.getItem(OLD_LOG_KEY) || '[]');
        if (!Array.isArray(old)) return [];
        return old.flatMap((o): LogEntry[] => {
            const date = Date.parse(o.date ?? '');
            if (!Number.isFinite(date) || !(Number(o.loaves) >= 1)) return [];
            const temp = Number(o.temperature);
            const outcome = (OUTCOMES as readonly string[]).includes(o.outcome ?? '') ? (o.outcome as Outcome) : undefined;
            return [{
                date, loaves: Number(o.loaves), size: o.size === 'large' ? 'large' : 'regular',
                ...(o.hydration ? { hydration: Number(o.hydration) } : {}),
                ...(Number.isFinite(temp) && temp > 0 ? { doughTemp: temp } : {}),
                ...(outcome ? { outcome } : {}), notes: o.notes ?? ''
            }];
        });
    } catch {
        return [];
    }
}

/** Adds the old bakes that are not already in the log. Returns how many were added. */
export function importOldLog(storage: StorageLike = globalThis.localStorage): number {
    const have = new Set(loadLog(storage).map((e) => e.date));
    const fresh = oldLogEntries(storage).filter((e) => !have.has(e.date));
    if (fresh.length) write([...loadLog(storage), ...fresh].sort((a, b) => b.date - a.date), storage);
    return fresh.length;
}
