// The plan for the whole bake, worked out from when you feed your starter.
import { clockAfter, hoursUntil, parseClock } from './feeding.js';

// Bulk fermentation temperature chart
export const BULK_FERMENTATION_TEMPS = [
    { temp: 27, hours: 5.5, rise: 30 },
    { temp: 26, hours: 5.5, rise: 30 },
    { temp: 25.5, hours: 6, rise: 40 },
    { temp: 25, hours: 6, rise: 40 },
    { temp: 24.5, hours: 7, rise: 50 },
    { temp: 24, hours: 7, rise: 50 },
    { temp: 23, hours: 8, rise: 55 },
    { temp: 22.5, hours: 9, rise: 60 },
    { temp: 22, hours: 10, rise: 65 },
    { temp: 21.5, hours: 11, rise: 70 },
    { temp: 21, hours: 12, rise: 75 },
    { temp: 20.5, hours: 13, rise: 80 },
    { temp: 20, hours: 14, rise: 85 },
    { temp: 19.5, hours: 15, rise: 90 },
    { temp: 19, hours: 16, rise: 95 },
    { temp: 18, hours: 16, rise: 100 }
];

// Sensible starting values; each can be changed in the timeline settings
export const PLAN_DEFAULTS = {
    doughTemp: 24,        // typical kitchen
    bakeAt: '08:00',      // a morning bake after the fridge
    extraFridgeDays: 0,
    saltRestMin: 30,
    foldCount: 4,
    foldGapMin: 30,
    preShapeMin: 30,
    finalShapeMin: 15,
    preheatMin: 45,
    minFridgeHours: 8,
    maxFridgeHours: 72
};

/** Bulk fermentation entry for a dough temperature: the closest one in the chart. */
export function bulkFor(temp) {
    let best = BULK_FERMENTATION_TEMPS[0];
    for (const d of BULK_FERMENTATION_TEMPS) {
        if (Math.abs(d.temp - temp) < Math.abs(best.temp - temp)) best = d;
    }
    return best;
}

// Moves a planned minute-count to the same clock time you actually did it, on the nearest day
const nearest = (plannedMinutes, actualClock, feedTime) => {
    const offset = parseClock(actualClock) - parseClock(feedTime);
    return plannedMinutes + ((((offset - plannedMinutes) % 1440) + 2160) % 1440) - 720;
};

/**
 * Builds the list of milestones as minutes after the feed. Each has the step it belongs to,
 * whether it needs you there (handsOn), and a clock time (with days after the feed day).
 *
 * `plannedAutolyse` ("HH:MM") overrides the autolyse start. `actuals` ({ starterIn, bulkEnd } as
 * "HH:MM") re-anchors the plan to what really happened.
 */
export function buildSchedule({
    feedTime, riseMinHours, autolyseMin = 60, fermentolyseMin = 60,
    doughTemp = PLAN_DEFAULTS.doughTemp, bakeAt = PLAN_DEFAULTS.bakeAt,
    extraFridgeDays = 0, bakeMinutes = 50, actuals = {}, plannedAutolyse = null
}) {
    const P = PLAN_DEFAULTS;
    const at = (m) => clockAfter(feedTime, m / 60);

    const peak = riseMinHours * 60;                    // earliest the starter is ready
    // If you planned an autolyse time (see "Plan from autolyse"), the starter goes in when that rest ends
    const autolyseStart = plannedAutolyse ? hoursUntil(feedTime, plannedAutolyse) * 60 : peak - autolyseMin;
    let starterIn = autolyseStart + autolyseMin;
    if (actuals.starterIn) starterIn = nearest(starterIn, actuals.starterIn, feedTime);

    const bulk = bulkFor(doughTemp);
    const firstFold = starterIn + fermentolyseMin + P.saltRestMin;
    const lastFold = firstFold + (P.foldCount - 1) * P.foldGapMin;
    let bulkEnd = Math.max(starterIn + bulk.hours * 60, lastFold + P.foldGapMin);
    if (actuals.bulkEnd) bulkEnd = nearest(bulkEnd, actuals.bulkEnd, feedTime);

    const finalShape = bulkEnd + P.preShapeMin;
    const fridge = finalShape + P.finalShapeMin;

    // Bake at the chosen clock time: the first one at least the minimum time in the fridge
    const fridgeClock = at(fridge);
    const wantMinutes = parseClock(bakeAt);
    let bake = fridge - parseClock(fridgeClock.time) + wantMinutes;        // that clock time on the fridge day
    while (bake < fridge + P.minFridgeHours * 60) bake += 1440;
    bake += extraFridgeDays * 1440;
    const fridgeHours = (bake - fridge) / 60;

    const ev = (key, stepId, label, minutes, handsOn, extra = {}) =>
        ({ key, stepId, label, minutes, clock: at(minutes), handsOn, ...extra });

    const events = [
        ev('feed', 1, 'Feed your starter', 0, true),
        ev('autolyse', 2, 'Start autolyse (mix flour and water)', autolyseStart, true),
        ev('starterIn', 3, 'Add the starter', starterIn, true),
        ev('salt', 4, 'Add salt, honey and oil', starterIn + fermentolyseMin, true),
        ev('folds', 5, `First fold (${P.foldCount} folds, ${P.foldGapMin} min apart)`, firstFold, true, { until: at(lastFold) }),
        ev('bulkEnd', 6, 'Bulk fermentation ends', bulkEnd, true, { note: `${bulk.rise}% rise` }),
        ev('preShape', 7, 'Pre-shape', bulkEnd, true),
        ev('finalShape', 8, 'Final shape', finalShape, true),
        ev('fridge', 9, 'Into the fridge', fridge, true),
        ev('oven', 10, 'Turn the oven on', bake - P.preheatMin, true),
        ev('bake', 10, 'Bake', bake, true),
        ev('out', 10, 'Loaf out', bake + bakeMinutes, true)
    ];
    return { events, fridgeHours, tooLongInFridge: fridgeHours > P.maxFridgeHours, bulk };
}
