// Starter feeding maths. Ratios are starter : flour : water by weight, e.g. 1:6:6.
// Rise times are hours to peak at about 21-22°C.
export const FEEDING_RATIOS = [
    { n: 1, ratio: '1:1:1', minHours: 4, maxHours: 6 },
    { n: 2, ratio: '1:2:2', minHours: 5, maxHours: 7 },
    { n: 3, ratio: '1:3:3', minHours: 6, maxHours: 8 },
    { n: 4, ratio: '1:4:4', minHours: 7, maxHours: 9 },
    { n: 5, ratio: '1:5:5', minHours: 8, maxHours: 10 },
    { n: 6, ratio: '1:6:6', minHours: 9, maxHours: 11 },
    { n: 7, ratio: '1:7:7', minHours: 10, maxHours: 12 },
    { n: 8, ratio: '1:8:8', minHours: 11, maxHours: 13 },
    { n: 9, ratio: '1:9:9', minHours: 12, maxHours: 14 },
    { n: 10, ratio: '1:10:10', minHours: 13, maxHours: 16 }
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
 * there is, dilutes further (1:7:7 up to 1:10:10, longer rises); if that still is not enough, says how far off.
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
 * Plan from autolyse: "I want to start autolyse at `autolyseAt`." The starter goes into the dough
 * an hour later (fermentolyse), so it should be at its earliest peak then: feed `minHours` before
 * that, as late as possible so it is fresh. Prefers 1:6:6; if the earliest you can feed
 * (`earliestFeed`, usually now) is too late for that, steps down through 1:5:5 ... 1:1:1, which
 * peak sooner but need more of your own starter. `have` is optional and only used to warn.
 */
export function planFromAutolyse({ need, autolyseAt, earliestFeed, have }) {
    const availableHours = hoursUntil(earliestFeed, autolyseAt) + 1;
    const options = FEEDING_RATIOS.filter((r) => r.n <= ASSUMED_RATIO_N).reverse().map((ratio) => {
        const feedAt_ = clockAfter(autolyseAt, 1 - ratio.minHours);
        const feed = feedAt(ratio.n, need);
        return {
            ratio, feed,
            feedTime: feedAt_,
            // relative to the autolyse day, so 'next day' never confuses a night-before feed
            window: { from: clockAfter(autolyseAt, 1), to: clockAfter(autolyseAt, 1 + ratio.maxHours - ratio.minHours) },
            possible: availableHours >= ratio.minHours,
            notEnoughStarter: have != null && feed.starter > have
        };
    });
    const recommended = options.find((o) => o.possible) || null;
    return {
        availableHours, options, recommended,
        quicker: recommended !== null && recommended.ratio.n < ASSUMED_RATIO_N,
        shortestHours: FEEDING_RATIOS[0].minHours
    };
}

/** Already fed: "I fed at `feedTime` at `ratio`." When will the starter be ready? */
export function planAlreadyFed({ feedTime, ratio }) {
    const r = findRatio(ratio);
    if (!r) throw new Error(`Unknown ratio: ${ratio}`);
    return { ratio: r, window: readyWindow(feedTime, r) };
}
