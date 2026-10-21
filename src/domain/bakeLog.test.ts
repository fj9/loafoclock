import { describe, expect, it } from 'vitest';
import { LOG_KEY, addToLog, exportLog, importOldLog, loadLog, oldLogEntries, parseBackup, quickFeedStreak, removeFromLog, type LogEntry } from './bakeLog';
import { fakeStorage } from './test-helpers';

const entry = (over: Partial<LogEntry> = {}): LogEntry => ({ date: 1000, loaves: 1, size: 'regular', notes: '', ...over });

describe('bake log', () => {
    it('adds newest first, removes, and ignores damaged data', () => {
        const s = fakeStorage();
        addToLog(entry({ date: 1 }), s);
        addToLog(entry({ date: 2, outcome: 'Good' }), s);
        expect(loadLog(s).map((e) => e.date)).toEqual([2, 1]);
        expect(removeFromLog(0, s).map((e) => e.date)).toEqual([1]);
        s.setItem(LOG_KEY, '{oops');
        expect(loadLog(s)).toEqual([]);
        s.setItem(LOG_KEY, JSON.stringify({ v: 1, entries: [entry(), { nonsense: true }, entry({ outcome: 'Great' as never })] }));
        expect(loadLog(s)).toHaveLength(1);
    });

    it('counts quick feeds in a row, newest first', () => {
        expect(quickFeedStreak([])).toBe(0);
        expect(quickFeedStreak([entry({ ratioN: 2 }), entry({ ratioN: 3 }), entry({ ratioN: 6 }), entry({ ratioN: 1 })])).toBe(2);
        expect(quickFeedStreak([entry({ ratioN: 6 }), entry({ ratioN: 1 })])).toBe(0);
        expect(quickFeedStreak([entry()])).toBe(0); // an imported bake has no ratio
    });

    it('backs up and restores', () => {
        const entries = [entry({ date: 5, ratioN: 6, doughTemp: 24, notes: 'lovely' })];
        expect(parseBackup(exportLog(entries))).toEqual(entries);
        expect(parseBackup('nope')).toBeNull();
        expect(parseBackup('{"v":2,"entries":[]}')).toBeNull();
    });

    it('imports the first app\'s log once, without touching it', () => {
        const s = fakeStorage();
        const old = [
            { date: '2026-05-01T10:00:00.000Z', loaves: 2, size: 'large', hydration: 75, outcome: 'Excellent', notes: 'great', temperature: '23' },
            { date: 'garbage', loaves: 1 }, { date: '2026-04-01T10:00:00.000Z', loaves: 1, outcome: 'Meh' }
        ];
        s.setItem('sourdoughLogs', JSON.stringify(old));
        expect(oldLogEntries(s)).toHaveLength(2);
        expect(importOldLog(s)).toBe(2);
        expect(importOldLog(s)).toBe(0);
        const log = loadLog(s);
        expect(log[0]).toMatchObject({ loaves: 2, size: 'large', hydration: 75, doughTemp: 23, outcome: 'Excellent' });
        expect(log[1]!.outcome).toBeUndefined();
        expect(s.getItem('sourdoughLogs')).toBe(JSON.stringify(old));
    });
});
