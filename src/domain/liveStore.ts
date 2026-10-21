// The locked plan and what you have ticked, saved so a reload or a locked phone loses nothing.
// The key starts with "loafoclock" so it never reads another app's data on the same site.
import type { Actuals, Levers } from './plan';
import type { StorageLike } from './settings';

export const LIVE_KEY = 'loafoclockLive';
const VERSION = 1;

export interface LiveRecord {
    /** The levers when the plan was locked. The "planned" times come from these. */
    original: Levers;
    /** The levers now. They differ from `original` if you edited the plan after locking. */
    levers: Levers;
    actuals: Actuals;
    lockedAt: number;
}

export const lockPlan = (levers: Levers, now: number): LiveRecord => ({ original: levers, levers, actuals: {}, lockedAt: now });

export function saveLive(rec: LiveRecord, storage: StorageLike = globalThis.localStorage): void {
    try {
        storage.setItem(LIVE_KEY, JSON.stringify({ v: VERSION, rec }));
    } catch {
        /* private mode */
    }
}

export function clearLive(storage: StorageLike = globalThis.localStorage): void {
    try {
        storage.removeItem(LIVE_KEY);
    } catch {
        /* ignore */
    }
}

const isLevers = (l: unknown): l is Levers => {
    const x = l as Levers | null;
    return !!x && typeof x === 'object' && Number.isFinite(x.feedAt) && Number.isInteger(x.ratioN) && x.ratioN >= 1 && x.ratioN <= 10 &&
        Number.isFinite(x.doughTemp) && Number.isFinite(x.starterDelayMin) && (x.cooling === 30 || x.cooling === 60) &&
        (x.size === 'regular' || x.size === 'large') && !!x.fridge && (x.fridge.kind === 'none' || (x.fridge.kind === 'hours' && Number.isFinite(x.fridge.hours)));
};

/** The saved plan, or null if there is none or it does not look right. */
export function loadLive(storage: StorageLike = globalThis.localStorage): LiveRecord | null {
    try {
        const saved = JSON.parse(storage.getItem(LIVE_KEY) || 'null');
        const r = saved?.rec;
        if (saved?.v !== VERSION || !r || !isLevers(r.original) || !isLevers(r.levers) || !Number.isFinite(r.lockedAt)) return null;
        if (!r.actuals || typeof r.actuals !== 'object') return null;
        for (const v of Object.values(r.actuals)) if (!Number.isFinite(v)) return null;
        return r as LiveRecord;
    } catch {
        return null;
    }
}
