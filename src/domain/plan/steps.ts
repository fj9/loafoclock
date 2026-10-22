// The plan: a chain of steps on real moments, built forward from the levers.
import { STEP_MINUTES, bakeMinutesFor, bulkFor, ratioFor, type Levers } from './levers';
import { HOUR, MINUTE } from './time';

export type StepId =
    | 'feed' | 'autolyse' | 'starterIn' | 'salt'
    | 'fold1' | 'fold2' | 'fold3' | 'fold4'
    | 'preShape' | 'finalShape' | 'fridge' | 'ovenOn' | 'bake' | 'out' | 'carve';

export const STEP_ORDER: readonly StepId[] = [
    'feed', 'autolyse', 'starterIn', 'salt', 'fold1', 'fold2', 'fold3', 'fold4',
    'preShape', 'finalShape', 'fridge', 'ovenOn', 'bake', 'out', 'carve'
];
export const FOLD_IDS: readonly StepId[] = ['fold1', 'fold2', 'fold3', 'fold4'];

/** Moments you actually did something, by step. They take the place of the planned moment. */
export type Actuals = Partial<Record<StepId, number>>;

export interface Step {
    id: StepId;
    label: string;
    at: number;
    /** Needs you to be there. Carving is the only step that does not. */
    needsYou: boolean;
}

export interface Plan {
    levers: Levers;
    steps: Step[];
    byId: Record<StepId, number>;
    /** When the starter first reaches the ready window, and when the window ends. */
    starterReadyAt: number;
    starterStaleAt: number;
    bulkHours: number;
    bulkRise: number;
    bulkEnd: number;
    /** Hours between the dough going into the fridge and the oven (0 if the fridge is skipped). */
    fridgeHours: number;
    readyToCarve: number;
}

const LABELS: Record<StepId, string> = {
    feed: 'Feed your starter', autolyse: 'Start the autolyse', starterIn: 'Add the starter',
    salt: 'Add salt, honey and oil', fold1: 'Fold 1', fold2: 'Fold 2', fold3: 'Fold 3', fold4: 'Fold 4',
    preShape: 'Pre-shape', finalShape: 'Final shape', fridge: 'Into the fridge', ovenOn: 'Turn the oven on',
    bake: 'Into the oven', out: 'Loaf out', carve: 'Ready to carve'
};

export const stepLabel = (id: StepId, noFridge = false): string =>
    id === 'fridge' && noFridge ? 'Proof on the counter' : LABELS[id];

/**
 * Builds the plan forward from the first feed. Anything in `actuals` is a moment that really
 * happened: it is used as it is and everything after it is timed from it.
 */
export function buildPlan(levers: Levers, actuals: Actuals = {}): Plan {
    const ratio = ratioFor(levers.ratioN);
    const bulk = bulkFor(levers.doughTemp);
    const feed = actuals.feed ?? levers.feedAt;

    const starterReadyAt = feed + ratio.minHours * HOUR;
    const starterStaleAt = feed + ratio.maxHours * HOUR;

    const plannedStarterIn = starterReadyAt + levers.starterDelayMin * MINUTE;
    let starterIn: number;
    let autolyse: number;
    if (actuals.autolyse !== undefined) {
        autolyse = actuals.autolyse;
        // The starter goes in when the rest ends, but never before it is ready.
        starterIn = actuals.starterIn ?? Math.max(autolyse + levers.autolyseMin * MINUTE, starterReadyAt);
    } else {
        starterIn = actuals.starterIn ?? plannedStarterIn;
        autolyse = starterIn - levers.autolyseMin * MINUTE;
    }

    const salt = actuals.salt ?? starterIn + levers.fermentolyseMin * MINUTE;
    const gap = STEP_MINUTES.foldGap * MINUTE;
    const fold1 = actuals.fold1 ?? salt + STEP_MINUTES.saltRest * MINUTE;
    const fold2 = actuals.fold2 ?? fold1 + gap;
    const fold3 = actuals.fold3 ?? fold2 + gap;
    const fold4 = actuals.fold4 ?? fold3 + gap;

    // Bulk is counted from the starter going in. A late fold moves the later folds, not the end of bulk
    // (unless the last fold is so late that bulk would end before it has had its half hour).
    const bulkEnd = Math.max(starterIn + bulk.hours * HOUR, fold4 + gap);
    const preShape = actuals.preShape ?? bulkEnd;
    const finalShape = actuals.finalShape ?? preShape + STEP_MINUTES.preShape * MINUTE;
    const fridge = actuals.fridge ?? finalShape + STEP_MINUTES.finalShape * MINUTE;

    const noFridge = levers.fridge.kind === 'none';
    let bake: number;
    if (actuals.bake !== undefined) bake = actuals.bake;
    else if (actuals.ovenOn !== undefined) bake = actuals.ovenOn + STEP_MINUTES.preheat * MINUTE;
    else bake = fridge + (noFridge ? STEP_MINUTES.counterProof * MINUTE : (levers.fridge as { hours: number }).hours * HOUR);
    const ovenOn = actuals.ovenOn ?? bake - STEP_MINUTES.preheat * MINUTE;
    const out = actuals.out ?? bake + bakeMinutesFor(levers.size) * MINUTE;
    const carve = out + levers.cooling * MINUTE;

    const byId: Record<StepId, number> = {
        feed, autolyse, starterIn, salt, fold1, fold2, fold3, fold4,
        preShape, finalShape, fridge, ovenOn, bake, out, carve
    };
    const steps: Step[] = STEP_ORDER.map((id) => ({
        id, label: stepLabel(id, noFridge), at: byId[id], needsYou: id !== 'carve'
    }));

    return {
        levers, steps, byId, starterReadyAt, starterStaleAt,
        bulkHours: bulk.hours, bulkRise: bulk.rise, bulkEnd,
        fridgeHours: noFridge ? 0 : (bake - fridge) / HOUR,
        readyToCarve: carve
    };
}

/** Hours from the first feed to ready to carve. */
export const totalHours = (p: Plan): number => (p.readyToCarve - p.byId.feed) / HOUR;
