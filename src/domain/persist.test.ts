import { describe, expect, it } from 'vitest';
import { BAKE_KEY, clearActiveBake, loadActiveBake, pausedTimer, saveActiveBake, savedAgo, startedTimer, timerNow } from './persist';
import { fakeStorage } from './test-helpers';

describe('saved bake', () => {
    it('round-trips a bake', () => {
        const s = fakeStorage();
        saveActiveBake({ loaves: 2, size: 'large', currentStep: 3, starterFeedTime: '22:00' }, s, 1000);
        const back = loadActiveBake(10, s)!;
        expect(back.bake).toMatchObject({ loaves: 2, size: 'large', currentStep: 3, starterFeedTime: '22:00' });
        expect(back.savedAt).toBe(1000);
    });
    it('is null when nothing is saved, or after clearing', () => {
        const s = fakeStorage();
        expect(loadActiveBake(10, s)).toBeNull();
        saveActiveBake({ loaves: 1, currentStep: 0 }, s);
        clearActiveBake(s);
        expect(loadActiveBake(10, s)).toBeNull();
    });
    it('ignores anything that does not look like a bake', () => {
        const s = fakeStorage();
        s.setItem(BAKE_KEY, 'not json'); expect(loadActiveBake(10, s)).toBeNull();
        s.setItem(BAKE_KEY, JSON.stringify({ v: 99, bake: { loaves: 1, currentStep: 0 } })); expect(loadActiveBake(10, s)).toBeNull();
        saveActiveBake({ loaves: 1, currentStep: 12 }, s); expect(loadActiveBake(10, s)).toBeNull(); // past the last step
        saveActiveBake({ loaves: 0, currentStep: 1 }, s); expect(loadActiveBake(10, s)).toBeNull();
    });
    it('describes when it was saved', () => {
        const now = 10_000_000_000;
        expect(savedAgo(now - 30_000, now)).toBe('just now');
        expect(savedAgo(now - 25 * 60_000, now)).toBe('25 minutes ago');
        expect(savedAgo(now - 3 * 3600_000, now)).toBe('3 hours ago');
        expect(savedAgo(now - 25 * 3600_000, now)).toBe('yesterday');
        expect(savedAgo(now - 72 * 3600_000, now)).toBe('3 days ago');
    });
});

describe('timer that survives a locked screen', () => {
    const t0 = 1_000_000;
    it('counts down from the end time, not from ticks', () => {
        const t = startedTimer(3600, 1, t0);
        expect(timerNow(t, t0)).toEqual({ seconds: 3600, running: true, finished: false });
        expect(timerNow(t, t0 + 600_000)!.seconds).toBe(3000);          // ten minutes later, screen was off
    });
    it('reports a timer that ran out while you were away', () => {
        const t = startedTimer(60, 1, t0);
        expect(timerNow(t, t0 + 90_000)).toEqual({ seconds: 0, running: false, finished: true });
    });
    it('pausing keeps what is left', () => {
        const t = startedTimer(300, 1, t0);
        const p = pausedTimer(t, 1, t0 + 100_000);
        expect(p).toMatchObject({ running: false, remaining: 200 });
        expect(timerNow(p, t0 + 999_999)).toEqual({ seconds: 200, running: false, finished: false });
    });
    it('has nothing when there is no timer', () => {
        expect(timerNow(null)).toBeNull();
    });
});
