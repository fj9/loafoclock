// Starter feeding maths. Ratios are starter : flour : water by weight, e.g. 1:6:6.
// Rise times are hours to peak at about 21-22°C.

export interface FeedingRatio {
    n: number;
    ratio: string;
    minHours: number;
    maxHours: number;
}

export const FEEDING_RATIOS: readonly FeedingRatio[] = [
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

// The standard feed: the one to prefer, and the one a small amount of starter is stretched with
export const ASSUMED_RATIO_N = 6;

export const findRatio = (ratio: string): FeedingRatio | undefined => FEEDING_RATIOS.find((r) => r.ratio === ratio);
export const riseLabel = (r: FeedingRatio): string => `${r.minHours}-${r.maxHours} hrs`;

// ---- Clock helpers: times are "HH:MM" strings, results say how many days on ----
export interface ClockResult {
    time: string;
    days: number;
}

export function parseClock(time: string): number {
    const [h = 0, m = 0] = time.split(':').map(Number);
    return h * 60 + m;
}

export function clockAfter(time: string, hours: number): ClockResult {
    const total = parseClock(time) + Math.round(hours * 60);
    const minutes = ((total % 1440) + 1440) % 1440;
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    return { time: `${hh}:${mm}`, days: Math.floor(total / 1440) };
}

/** Hours from `from` until the next time it is `to` (same clock time means a full 24 hours). */
export function hoursUntil(from: string, to: string): number {
    const diff = (parseClock(to) - parseClock(from) + 1440) % 1440;
    return (diff === 0 ? 1440 : diff) / 60;
}

// ---- Amounts ----
export interface Feed {
    starter: number;
    flour: number;
    water: number;
    total: number;
}

/** Starter to use so that starter + flour + water at 1:n:n makes at least `need` grams. */
export function feedAt(n: number, need: number): Feed {
    const starter = Math.ceil(need / (1 + 2 * n));
    return { starter, flour: starter * n, water: starter * n, total: starter * (1 + 2 * n) };
}

export interface ReadyWindow {
    from: ClockResult;
    to: ClockResult;
}

function readyWindow(feedTime: string, r: FeedingRatio): ReadyWindow {
    return { from: clockAfter(feedTime, r.minHours), to: clockAfter(feedTime, r.maxHours) };
}

export type LimitedPlan =
    | { canReach: true; alreadyEnough: boolean; diluted: boolean; ratio: FeedingRatio; feed: Feed; window: ReadyWindow }
    | { canReach: false; alreadyEnough: boolean; ratio: FeedingRatio; reachable: number; minStarter: number };

/**
 * Limited starter: "I have `have` g and need `need` g." Feeds at 1:6:6 using only as much
 * starter as needed, so the rest of the jar is untouched. If even that needs more starter than
 * there is, dilutes further (1:7:7 up to 1:10:10, longer rises); if that still is not enough, says how far off.
 */
export function planLimitedStarter({ have, need, feedTime }: { have: number; need: number; feedTime: string }): LimitedPlan {
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
    const richest = FEEDING_RATIOS[FEEDING_RATIOS.length - 1]!;
    return {
        canReach: false, alreadyEnough, ratio: richest,
        reachable: have * (1 + 2 * richest.n), minStarter: feedAt(richest.n, need).starter
    };
}

export type FitStatus = 'fits' | 'tooSlow' | 'tooFast';

export interface FeedOption {
    ratio: FeedingRatio;
    feed: Feed;
    fits: boolean;
    status: FitStatus;
    offHours: number;
    window: ReadyWindow;
    notEnoughStarter: boolean;
}

export type FeedProblem =
    | { kind: 'tooShort'; feedBy: string; fallback: FeedOption }
    | { kind: 'tooLong'; feedFrom: string; fallback: FeedOption };

export interface FeedForAutolyse {
    gapHours: number;
    options: FeedOption[];
    best: FeedOption | null;
    problem: FeedProblem | null;
    sixOption: FeedOption | undefined;
}

/**
 * Plan a feed backwards from autolyse: "I'm feeding at `feedTime` and want to start autolyse at
 * `autolyseAt`." The starter goes into the dough when the autolyse rest ends, so that is how long
 * it has to rise. Picks the ratio whose rise window contains that time, preferring 1:6:6, then the
 * one whose window is centred closest to it. Every ratio is returned with how well it fits.
 * `have` is optional and only used to warn.
 */
export function planFeedForAutolyse(args: {
    need: number;
    feedTime: string;
    autolyseAt: string;
    autolyseMin?: number;
    have?: number | null;
}): FeedForAutolyse {
    const { need, feedTime, autolyseAt, autolyseMin = 60, have } = args;
    const restHours = autolyseMin / 60;
    const gapHours = hoursUntil(feedTime, autolyseAt) + restHours;
    const options: FeedOption[] = FEEDING_RATIOS.map((ratio) => {
        const feed = feedAt(ratio.n, need);
        const fits = gapHours >= ratio.minHours && gapHours <= ratio.maxHours;
        const status: FitStatus = fits ? 'fits' : gapHours < ratio.minHours ? 'tooSlow' : 'tooFast';
        const offHours = fits ? 0 : status === 'tooSlow' ? ratio.minHours - gapHours : gapHours - ratio.maxHours;
        return {
            ratio, feed, fits, status, offHours,
            window: readyWindow(feedTime, ratio),
            notEnoughStarter: have != null && feed.starter > have
        };
    });
    const fitting = options.filter((o) => o.fits);
    const six = fitting.find((o) => o.ratio.n === ASSUMED_RATIO_N);
    const mid = (o: FeedOption) => (o.ratio.minHours + o.ratio.maxHours) / 2;
    const best = six || [...fitting].sort((a, b) => Math.abs(gapHours - mid(a)) - Math.abs(gapHours - mid(b)))[0] || null;

    const shortest = FEEDING_RATIOS[0]!.minHours;
    const longest = FEEDING_RATIOS[FEEDING_RATIOS.length - 1]!.maxHours;
    let problem: FeedProblem | null = null;
    if (!best) {
        problem = gapHours < shortest
            ? { kind: 'tooShort', feedBy: clockAfter(autolyseAt, restHours - shortest).time, fallback: options[0]! }
            : { kind: 'tooLong', feedFrom: clockAfter(autolyseAt, restHours - longest).time, fallback: options[options.length - 1]! };
    }
    return { gapHours, options, best, problem, sixOption: options.find((o) => o.ratio.n === ASSUMED_RATIO_N) };
}

/** Already fed: "I fed at `feedTime` at `ratio`." When will the starter be ready? */
export function planAlreadyFed({ feedTime, ratio }: { feedTime: string; ratio: string }): { ratio: FeedingRatio; window: ReadyWindow } {
    const r = findRatio(ratio);
    if (!r) throw new Error(`Unknown ratio: ${ratio}`);
    return { ratio: r, window: readyWindow(feedTime, r) };
}

// Hours when most people would rather be asleep: 23:00 up to (not including) 06:00
export const AWKWARD_FROM = 23 * 60;
export const AWKWARD_TO = 6 * 60;
export function isAwkwardHour(time: string): boolean {
    const m = parseClock(time);
    return m >= AWKWARD_FROM || m < AWKWARD_TO;
}

const clockFromMinutes = (m: number): string =>
    `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export interface FeedTimeOption {
    feedTime: string;
    ratio: FeedingRatio;
    feed: Feed;
    gapHours: number;
    notEnoughStarter: boolean;
}

/**
 * The feed times that suit an autolyse time: every whole hour between `from` and `to` (waking
 * hours by default) at which some feed fits, each with the best ratio for it. Earliest feed first.
 */
export function feedTimeOptions(args: {
    autolyseAt: string;
    autolyseMin?: number;
    need: number;
    have?: number | null;
    fromHour?: number;
    toHour?: number;
}): FeedTimeOption[] {
    const { autolyseAt, autolyseMin = 60, need, have = null, fromHour = 6, toHour = 22 } = args;
    const options: FeedTimeOption[] = [];
    for (let h = fromHour; h <= toHour; h++) {
        const feedTime = clockFromMinutes(h * 60);
        const plan = planFeedForAutolyse({ need, feedTime, autolyseAt, autolyseMin, have });
        if (plan.best) {
            options.push({
                feedTime, ratio: plan.best.ratio, feed: plan.best.feed, gapHours: plan.gapHours,
                notEnoughStarter: plan.best.notEnoughStarter
            });
        }
    }
    return options.sort((a, b) => b.gapHours - a.gapHours);
}

/** The option to start on: the latest feed that is a standard 1:6:6, else the latest one. */
export function defaultFeedOption(options: FeedTimeOption[]): FeedTimeOption | null {
    const sixes = options.filter((o) => o.ratio.n === ASSUMED_RATIO_N);
    return (sixes.length ? sixes[sixes.length - 1] : options[options.length - 1]) ?? null;
}
