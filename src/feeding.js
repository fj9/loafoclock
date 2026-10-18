// Starter feeding maths. Ratios are starter : flour : water by weight, e.g. 1:6:6.
// Rise times (hours to peak at 21-27°C) are from Kanika's Cooking Class feeding chart.
export const FEEDING_RATIOS = [
    { n: 1, ratio: '1:1:1', minHours: 4, maxHours: 6 },
    { n: 2, ratio: '1:2:2', minHours: 5, maxHours: 7 },
    { n: 3, ratio: '1:3:3', minHours: 6, maxHours: 8 },
    { n: 4, ratio: '1:4:4', minHours: 7, maxHours: 10 },
    { n: 5, ratio: '1:5:5', minHours: 8, maxHours: 12 },
    { n: 6, ratio: '1:6:6', minHours: 10, maxHours: 14 },
    { n: 10, ratio: '1:10:10', minHours: 12, maxHours: 16 }
];

// Limited-starter mode assumes this ratio, the most common stretch for a small amount of starter
export const ASSUMED_RATIO_N = 6;

const byN = (n) => FEEDING_RATIOS.find((r) => r.n === n);
export const findRatio = (ratio) => FEEDING_RATIOS.find((r) => r.ratio === ratio);
export const riseLabel = (r) => `${r.minHours}-${r.maxHours} hrs`;

// ---- Clock helpers: times are "HH:MM" strings, results say how many days on ----
export function parseClock(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

export function clockAfter(time, hours) {
    const total = parseClock(time) + Math.round(hours * 60);
    const minutes = ((total % 1440) + 1440) % 1440;
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    return { time: `${hh}:${mm}`, days: Math.floor(total / 1440) };
}

/** Hours from `from` until the next time it is `to` (same clock time means a full 24 hours). */
export function hoursUntil(from, to) {
    const diff = (parseClock(to) - parseClock(from) + 1440) % 1440;
    return (diff === 0 ? 1440 : diff) / 60;
}

// ---- Amounts ----
/** Starter to use so that starter + flour + water at 1:n:n makes at least `need` grams. */
export function feedAt(n, need) {
    const starter = Math.ceil(need / (1 + 2 * n));
    return { starter, flour: starter * n, water: starter * n, total: starter * (1 + 2 * n) };
}

function readyWindow(feedTime, r) {
    return { from: clockAfter(feedTime, r.minHours), to: clockAfter(feedTime, r.maxHours) };
}

/**
 * Limited starter: "I have `have` g and need `need` g." Feeds at 1:6:6 using only as much
 * starter as needed, so the rest of the jar is untouched. If even that needs more starter than
 * there is, dilutes further (1:10:10, a longer rise); if that still is not enough, says how far off.
 */
export function planLimitedStarter({ have, need, feedTime }) {
    const alreadyEnough = have >= need;
    for (const r of FEEDING_RATIOS.filter((x) => x.n >= ASSUMED_RATIO_N)) {
        const feed = feedAt(r.n, need);
        if (feed.starter <= have) {
            return {
                canReach: true, alreadyEnough, diluted: r.n > ASSUMED_RATIO_N,
                ratio: r, feed, window: readyWindow(feedTime, r)
            };
        }
    }
    const richest = FEEDING_RATIOS[FEEDING_RATIOS.length - 1];
    return {
        canReach: false, alreadyEnough, ratio: richest,
        reachable: have * (1 + 2 * richest.n), minStarter: feedAt(richest.n, need).starter
    };
}

/**
 * Deadline: "I need `need` g by `neededBy`, feeding at `feedTime`." Picks the richest ratio
 * whose mid-point rise time fits the hours available, so it is ready around the deadline
 * rather than long before it. `have` is optional and only used to warn.
 */
export function planDeadline({ need, feedTime, neededBy, have }) {
    const hours = hoursUntil(feedTime, neededBy);
    const fits = FEEDING_RATIOS.filter((r) => (r.minHours + r.maxHours) / 2 <= hours);
    const r = fits.length ? fits[fits.length - 1] : FEEDING_RATIOS[0];
    const feed = feedAt(r.n, need);
    return {
        hours, ratio: r, feed, window: readyWindow(feedTime, r),
        tooShort: hours < r.minHours,           // can't be ready in time even at 1:1:1
        tooLong: hours > FEEDING_RATIOS[FEEDING_RATIOS.length - 1].maxHours, // longer than the chart covers
        notEnoughStarter: have != null && feed.starter > have
    };
}
