// Plain-English explanations for the jargon, shown as (i) tooltips next to the term.
export interface Tip {
    label: string;
    text: string;
}

export const TIPS = {
    starter: {
        label: 'feeding the starter',
        text: 'Giving your jar of sourdough starter fresh flour and water so it is bubbly and active. Active starter is what makes the dough rise.'
    },
    ratio: {
        label: 'a feeding ratio',
        text: 'Parts of starter : flour : water, by weight. 1:6:6 means 1g of starter for every 6g of flour and 6g of water. More flour and water takes longer to rise but needs less starter. The slider picks the ratio for you: slide right for a longer wait.'
    },
    loaf: {
        label: 'your loaf',
        text: 'How many loaves and how big. Only the amounts change, apart from a larger loaf baking a little longer.'
    },
    hydration: {
        label: 'hydration',
        text: 'How much water there is compared with flour. Higher is wetter, stickier dough with a more open crumb. 70% is a good place to start.'
    },
    extendStarter: {
        label: 'extend starter fermentation time',
        text: 'Leave your fed starter to ferment for longer once it is ready, so you can start the autolyse later, such as in the morning. Starter left too long goes stale, so the slider stops before that.'
    },
    cooling: {
        label: 'cooling before carving',
        text: 'The loaf is still cooking inside as it cools. Cutting too early gives a gummy crumb, so wait for the time you pick.'
    },
    haveStarter: {
        label: 'starter I have',
        text: 'How much starter is in your jar right now, in grams.'
    },
    needStarter: {
        label: 'starter I need',
        text: 'The starter for the dough, plus 30g to keep back in the jar as your next starter. We have filled this in for you.'
    },
    feedAt: {
        label: 'feed time',
        text: 'When you plan to feed your starter. Slide it to see how the ratio changes.'
    },
    autolyseAt: {
        label: 'autolyse start',
        text: 'When you want to mix the flour and water together. We will work out when to feed the starter so it is ready in time.'
    },
    ready: {
        label: 'ready starter',
        text: 'Ready means active: risen, with lots of bubbles. Use it soon after it peaks, within a couple of hours.'
    },
    autolyse: {
        label: 'autolyse',
        text: 'Mixing only the flour and water and leaving them to rest.'
    },
    restLength: {
        label: 'rest length',
        text: 'Anywhere from 30 to 60 minutes works. An hour is the usual. A shorter rest is fine if you need.'
    },
    fermentolyse: {
        label: 'fermentolyse',
        text: 'Mixing your active starter into the rested dough, then leaving it again. This is when the dough starts to rise, so note the time you add the starter.'
    },
    enrichments: {
        label: 'salt and enrichments',
        text: 'Salt adds flavour and strength. Honey and olive oil make the loaf softer. They go in after the starter has had a head start.'
    },
    folds: {
        label: 'stretch and folds',
        text: 'Wet your hand, lift one edge of the dough, stretch it up and fold it over the middle. Turn the bowl and repeat all the way round. It builds strength without kneading.'
    },
    bulk: {
        label: 'bulk fermentation',
        text: "The dough's first long rise, in the bowl. It is ready when it has grown by the target amount and looks puffy, wobbly and bubbly."
    },
    doughTemp: {
        label: 'dough temperature',
        text: 'Warmer dough rises faster. A thermometer in the middle of the dough is best. No thermometer? Tap the option closest to your kitchen.'
    },
    targetRise: {
        label: 'target rise',
        text: 'How much bigger the dough should get. 50% means one and a half times its starting size. Put the dough in a straight-sided tub and mark the level.'
    },
    totalBulk: {
        label: 'total bulk time',
        text: 'How long, from adding the starter, until the first rise is finished. It is an estimate: go by how the dough looks.'
    },
    preShape: {
        label: 'pre-shape',
        text: 'A gentle first shaping into a loose round, then a short rest. It makes the final shaping easier.'
    },
    finalShape: {
        label: 'final shape',
        text: 'Shape the dough into a tight oval and place it seam side up in a floured banneton (a proving basket).'
    },
    retardation: {
        label: 'cold retardation',
        text: 'Leaving the shaped dough in the fridge to rise slowly. It builds flavour and lets you bake when it suits you. Overnight is fine; up to 72 hours works.'
    },
    fridgePlanner: {
        label: 'the bake time planner',
        text: 'Tell us when the dough goes in the fridge and how long you will leave it, and we will tell you the earliest time to bake.'
    },
    baking: {
        label: 'baking in a Dutch oven',
        text: 'A heavy pot with a lid, heated until very hot. The lid traps steam so the loaf can spring up. You take the lid off for the second half to brown the crust.'
    }
} as const satisfies Record<string, Tip>;

export type TipKey = keyof typeof TIPS;

/** Which tip goes with each step, by step id. */
export const STEP_TIPS: Record<number, TipKey> = {
    1: 'starter', 2: 'autolyse', 3: 'fermentolyse', 4: 'enrichments', 5: 'folds',
    6: 'bulk', 7: 'preShape', 8: 'finalShape', 9: 'retardation', 10: 'baking'
};
