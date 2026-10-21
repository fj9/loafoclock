// A stand-in for localStorage, for tests.
import type { StorageLike } from './settings';

export function fakeStorage(): StorageLike & { data: Record<string, string> } {
    const data: Record<string, string> = {};
    return {
        getItem: (k) => (k in data ? data[k]! : null),
        setItem: (k, v) => { data[k] = String(v); },
        removeItem: (k) => { delete data[k]; },
        data
    };
}
