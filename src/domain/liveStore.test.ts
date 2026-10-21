import { describe, expect, it } from 'vitest';
import { LIVE_KEY, clearLive, loadLive, lockPlan, saveLive } from './liveStore';
import { leversAt } from './plan';
import { fakeStorage } from './test-helpers';

describe('saved live plan', () => {
    it('round-trips and clears', () => {
        const s = fakeStorage();
        const rec = { ...lockPlan(leversAt(1000), 2000), actuals: { feed: 1500 } };
        saveLive(rec, s);
        expect(loadLive(s)).toEqual(rec);
        clearLive(s);
        expect(loadLive(s)).toBeNull();
    });
    it('ignores a record that is damaged or from another version', () => {
        const s = fakeStorage();
        s.setItem(LIVE_KEY, 'not json');
        expect(loadLive(s)).toBeNull();
        s.setItem(LIVE_KEY, JSON.stringify({ v: 99, rec: lockPlan(leversAt(0), 0) }));
        expect(loadLive(s)).toBeNull();
        s.setItem(LIVE_KEY, JSON.stringify({ v: 1, rec: { ...lockPlan(leversAt(0), 0), actuals: { feed: 'x' } } }));
        expect(loadLive(s)).toBeNull();
        s.setItem(LIVE_KEY, JSON.stringify({ v: 1, rec: { ...lockPlan(leversAt(0), 0), levers: { ratioN: 99 } } }));
        expect(loadLive(s)).toBeNull();
    });
    it('does not throw when storage is unavailable', () => {
        const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => { throw new Error('no'); } };
        expect(() => saveLive(lockPlan(leversAt(0), 0), broken)).not.toThrow();
        expect(loadLive(broken)).toBeNull();
        expect(() => clearLive(broken)).not.toThrow();
    });
});
