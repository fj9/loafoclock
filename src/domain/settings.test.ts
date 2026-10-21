import { describe, expect, it } from 'vitest';
import { applyDisplaySettings, loadSettings, saveSettings } from './settings';
import { fakeStorage } from './test-helpers';

describe('settings', () => {
    it('saves and merges', () => {
        const s = fakeStorage();
        saveSettings({ clock12: false }, s);
        saveSettings({ hints: false }, s);
        expect(loadSettings(s)).toEqual({ clock12: false, hints: false });
    });
    it('copes with broken storage', () => {
        const s = fakeStorage(); s.setItem('loafoclockSettings', '{bad');
        expect(loadSettings(s)).toEqual({});
    });
    it('applies hints and text size to the page', () => {
        const root = { dataset: {} as DOMStringMap };
        applyDisplaySettings({ hints: false, textSize: 'large' }, root);
        expect(root.dataset).toEqual({ hints: 'off', text: 'large' });
        applyDisplaySettings({}, root);
        expect(root.dataset).toEqual({ hints: 'on', text: 'normal' });
        applyDisplaySettings({ textSize: 'huge' as never }, root);
        expect(root.dataset.text).toBe('normal');
    });
});
