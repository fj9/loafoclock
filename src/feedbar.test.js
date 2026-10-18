import { describe, expect, it } from 'vitest';
import { findRatio } from './feeding.js';
import { feedBarHtml } from './feedbar.js';

const r66 = findRatio('1:6:6'); // ready 9-11h after feeding

describe('feedBarHtml', () => {
    it('shows the feed, the ready window and the times', () => {
        const html = feedBarHtml({ feedTime: '22:00', ratio: r66, autolyseHours: 10, starterInHours: 11 });
        expect(html).toContain('Feed 22:00');
        expect(html).toContain('Autolyse 08:00 (next day)');
        expect(html).toContain('Starter in 09:00 (next day)');
        expect(html).toContain('Ready 07:00 to 09:00 (next day)');
    });
    it('puts the ready band where the ratio says, on a bar that ends an hour after the last marker', () => {
        const html = feedBarHtml({ feedTime: '22:00', ratio: r66, starterInHours: 11 });
        // axis is 0 to 12h: band 9/12 = 75% to 11/12, so 16.7% wide
        expect(html).toContain('left: 75.0%; width: 16.7%');
    });
    it('flags the starter-in marker when it is outside the ready window', () => {
        expect(feedBarHtml({ feedTime: '22:00', ratio: r66, starterInHours: 11 })).not.toContain('fb-off');
        expect(feedBarHtml({ feedTime: '22:00', ratio: r66, starterInHours: 13 })).toContain('fb-off');
    });
    it('names both days only when the window crosses midnight', () => {
        const html = feedBarHtml({ feedTime: '15:00', ratio: r66 }); // ready 00:00 to 02:00 (next day)
        expect(html).toContain('Ready 00:00 to 02:00 (next day)');
        const cross = feedBarHtml({ feedTime: '13:00', ratio: r66 }); // 22:00 to 00:00 (next day)
        expect(cross).toContain('Ready 22:00 to 00:00 (next day)');
    });
    it('works with just a feed and a ratio', () => {
        const html = feedBarHtml({ feedTime: '17:00', ratio: r66 });
        expect(html).not.toContain('Autolyse');
        expect(html).toContain('aria-label="Feed at 17:00; starter ready 02:00 to 04:00 (next day)"');
    });
});
