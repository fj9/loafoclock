// A small bar showing what a feed does over time: when you feed, when the starter is ready
// (the green band), and when you start autolyse and add the starter to the dough.
import { clockAfter } from './feeding.js';

const dayText = (days) => (days === 0 ? '' : days === 1 ? ' (next day)' : ` (+${days} days)`);
const clock = (feedTime, hours) => {
    const c = clockAfter(feedTime, hours);
    return `${c.time}${dayText(c.days)}`;
};
const pct = (hours, end) => `${Math.max(0, Math.min(100, (hours / end) * 100)).toFixed(1)}%`;

/**
 * `autolyseHours` and `starterInHours` are hours after the feed (both optional).
 * `starterInHours` is where the starter goes into the dough; the bar flags it if it falls
 * outside the ready band.
 */
export function feedBarHtml({ feedTime, ratio, autolyseHours = null, starterInHours = null }) {
    const end = Math.max(ratio.maxHours, starterInHours ?? 0) + 1;
    const inBand = starterInHours === null || (starterInHours >= ratio.minHours && starterInHours <= ratio.maxHours);
    const markers = [
        { at: 0, cls: 'fb-feed' },
        ...(autolyseHours !== null ? [{ at: autolyseHours, cls: 'fb-autolyse' }] : []),
        ...(starterInHours !== null ? [{ at: starterInHours, cls: `fb-in ${inBand ? '' : 'fb-off'}` }] : [])
    ];
    const legend = [
        `<span><i class="fb-dot fb-feed"></i>Feed ${clock(feedTime, 0)}</span>`,
        autolyseHours !== null ? `<span><i class="fb-dot fb-autolyse"></i>Autolyse ${clock(feedTime, autolyseHours)}</span>` : '',
        starterInHours !== null ? `<span><i class="fb-dot fb-in"></i>Starter in ${clock(feedTime, starterInHours)}</span>` : '',
        `<span><i class="fb-dot fb-band"></i>Ready ${clock(feedTime, ratio.minHours)} to ${clock(feedTime, ratio.maxHours)}</span>`
    ].join('');
    const label = `Feed at ${clock(feedTime, 0)}; starter ready ${clock(feedTime, ratio.minHours)} to ${clock(feedTime, ratio.maxHours)}`;
    return `
        <div class="fb" role="img" aria-label="${label}">
            <div class="fb-bar">
                <div class="fb-readyband" style="left: ${pct(ratio.minHours, end)}; width: ${(parseFloat(pct(ratio.maxHours, end)) - parseFloat(pct(ratio.minHours, end))).toFixed(1)}%"></div>
                ${markers.map((m) => `<div class="fb-mk ${m.cls}" style="left: ${pct(m.at, end)}"></div>`).join('')}
            </div>
            <div class="fb-legend">${legend}</div>
        </div>`;
}
