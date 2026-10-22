// What to do at each step: the amounts, the instructions and any timer.
import { feedAt } from './feeding';
import { bakePlan, recipeFor } from './recipe';
import type { TipKey } from './tips';
import { STEP_MINUTES, type Levers, type Plan, type StepId } from './plan';

export interface Guide {
    title: string;
    /** "450g flour" and so on. */
    ingredients: string[];
    instructions: string[];
    note?: string;
    /** A timer worth offering, in minutes. */
    timerMinutes?: number;
    tip?: TipKey;
}

/** The amounts for the loaves you chose. */
export const recipeOf = (l: Levers) => recipeFor({ loaves: l.loaves ?? 1, size: l.size, hydration: l.hydration });

/** Starter to keep back in the jar as the next starter. */
export const KEEP_BACK_G = 30;

const FOLD_INSTRUCTIONS = [
    'Wet your hand, lift one edge of the dough, stretch it up and fold it over the middle',
    'Turn the bowl and repeat all the way round'
];

export function guideFor(id: StepId, plan: Plan, clock: (ms: number) => string): Guide {
    const l = plan.levers;
    const r = recipeOf(l);
    const rest = (m: number) => (m === 60 ? '1 hour' : `${m} minutes`);
    switch (id) {
        case 'feed': {
            const f = feedAt(l.ratioN, r.starter + KEEP_BACK_G);
            return {
                title: 'Feed your starter',
                ingredients: [`${f.starter}g starter, straight from the fridge`, `${f.water}g water`, `${f.flour}g flour`],
                instructions: [
                    'Put the starter in a clean jar and add the water',
                    'Mix thoroughly until the water is fully mixed into the starter',
                    'Add the flour and mix until no dry flour remains',
                    `Cover and leave it somewhere warm to ferment until it is active, bubbly and at its peak, about ${clock(plan.starterReadyAt)} to ${clock(plan.starterStaleAt)}`
                ],
                note: `Makes ${f.total}g at 1:${l.ratioN}:${l.ratioN}: ${r.starter}g for the dough and ${f.total - r.starter}g to keep as your next starter.`,
            };
        }
        case 'autolyse':
            return {
                title: 'Autolyse', ingredients: [`${r.flour}g flour`, `${r.water}g water`],
                instructions: ['Mix flour and water until no dry flour remains', `Cover and rest for ${rest(l.autolyseMin)}`],
                timerMinutes: l.autolyseMin, tip: 'autolyse'
            };
        case 'starterIn':
            return {
                title: 'Add the starter', ingredients: [`${r.starter}g active starter`],
                instructions: ['Add the active starter to the dough', 'Mix until fully incorporated', `Rest for ${rest(l.fermentolyseMin)}`],
                note: 'This marks the start of bulk fermentation.', timerMinutes: l.fermentolyseMin, tip: 'fermentolyse'
            };
        case 'salt':
            return {
                title: 'Add salt, honey and oil', ingredients: [`${r.salt}g salt`, `${r.honey}g honey`, `${r.oil}g extra virgin olive oil`],
                instructions: ['Add the salt, honey and olive oil', 'Work them into the dough until evenly distributed', `Rest the dough for ${STEP_MINUTES.saltRest} minutes`],
                timerMinutes: STEP_MINUTES.saltRest, tip: 'enrichments'
            };
        case 'fold1': case 'fold2': case 'fold3': case 'fold4': {
            const n = Number(id.slice(4));
            return {
                title: `Stretch and fold ${n} of 4`, ingredients: [],
                instructions: [...FOLD_INSTRUCTIONS, ...(n === 4 ? ['If you are adding bulky inclusions (cheese, fruit, chocolate), add them during this fold'] : [])],
                note: n < 4 ? `The next fold is ${STEP_MINUTES.foldGap} minutes after this one.` : 'After this fold, leave the dough to finish rising.',
                timerMinutes: STEP_MINUTES.foldGap
            };
        }
        case 'preShape':
            return {
                title: 'Pre-shape', ingredients: [],
                instructions: [
                    `Check the dough has risen about ${plan.bulkRise}% and looks puffy, wobbly and bubbly`,
                    'Pre-shape it into a loose round to build structure', `Let it rest on the bench for ${STEP_MINUTES.preShape} minutes`
                ],
                note: `At ${l.doughTemp}°C bulk takes about ${plan.bulkHours} hours from adding the starter. Go by the dough, not the clock.`,
                timerMinutes: STEP_MINUTES.preShape, tip: 'preShape'
            };
        case 'finalShape':
            return {
                title: 'Final shape', ingredients: [],
                instructions: ['Shape the dough into a tight oval', 'Place it seam side up in a floured banneton', l.fridge.kind === 'none' ? 'Leave it on the counter to proof' : 'Cover it, ready for the fridge'],
            };
        case 'fridge':
            return l.fridge.kind === 'none'
                ? {
                    title: 'Proof on the counter', ingredients: [],
                    instructions: ['Leave the shaped dough on the counter for about 2 to 3 hours', 'Poke it gently: it should spring back slowly'],
                    note: 'Skipping the fridge is quicker but gives a less sourdough loaf.', timerMinutes: STEP_MINUTES.counterProof
                }
                : {
                    title: 'Into the fridge', ingredients: [],
                    instructions: ['Put the covered banneton in the fridge', `Leave it for about ${plan.fridgeHours} hours (8 to 72 is fine)`],
                    note: 'Longer in the fridge develops more flavour. You bake it straight from cold.', tip: 'retardation'
                };
        case 'ovenOn':
            return {
                title: 'Turn the oven on', ingredients: [],
                instructions: ['Put the Dutch oven in the oven and heat it to 240°C'],
                timerMinutes: STEP_MINUTES.preheat, tip: 'baking'
            };
        case 'bake': {
            const b = bakePlan({ size: l.size });
            return {
                title: 'Bake', ingredients: [], instructions: b.instructions.slice(1),
                note: `${b.duration}. Bake straight from the fridge: no need to bring it to room temperature.`, tip: 'baking'
            };
        }
        case 'out':
            return {
                title: 'Loaf out', ingredients: [],
                instructions: ['Lift the loaf out onto a wire rack', `Let it cool for at least ${l.cooling} minutes before you cut it`],
                timerMinutes: l.cooling
            };
        case 'carve':
            return { title: 'Ready to carve', ingredients: [], instructions: ['Slice it and enjoy it'] };
    }
}
