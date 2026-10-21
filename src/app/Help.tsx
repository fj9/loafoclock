export const FAQ: ReadonlyArray<{ q: string; a: string }> = [
    { q: 'What are the levers?', a: 'Feed ratio decides when your starter is ready. Dough temperature decides how long bulk fermentation takes. Time in the fridge, from 8 to 72 hours, decides when you bake. Change one and the steps after it move on the timeline.' },
    { q: 'Why does the feed ratio matter?', a: 'The ratio is how much flour and water you add to your starter. A small feed, like 1:1:1, is ready in 4 to 6 hours. A big one, like 1:10:10, takes 13 to 16 hours. So the ratio lets you choose when your starter is ready.' },
    { q: 'Keeping a healthy starter', a: 'As a rule of thumb, a starter you keep in the fridge and feed about once a week does well on a steady routine. A feed of around 1:6:6 gives it plenty to eat, and an occasional bigger feed such as 1:9:9 is gentle too. Quick feeds, 1:3:3 or quicker, are fine now and then to hurry a bake, but if you use them every time the starter gets through its food fast and may be less settled. That is guidance, not a measured fact. If your starter is bubbly, smells pleasantly sour and rises well, it is doing fine. Your log records the feed you used, and the app will nudge you after a few quick feeds in a row.' },
    { q: 'Why does dough temperature change bulk time?', a: 'Warmer dough rises faster. A 24°C dough needs about 7 hours of bulk fermentation, a 21°C dough about 12, and an 18°C dough about 16. The target rise changes too, from 50% at 24°C to 75% at 21°C. Bulk is counted from the moment the starter goes in.' },
    { q: 'Why use the fridge?', a: 'After shaping, the dough goes in the fridge for 8 to 72 hours. The cold slows the rise right down, so you can bake when it suits you, and longer stays give deeper flavour. You can skip the fridge and bake after 2 to 3 hours on the counter, which is quicker but gives a less sourdough loaf.' },
    { q: 'Why are some times in my sleeping hours?', a: 'Every step that needs you is kept between 6:00 am and 11:00 pm. If a lever pushes a step outside that, the plan tells you, and often offers a nearby fridge time that fits. Carving is the one thing that can wait: a loaf can come out of the oven at bedtime and be carved in the morning, within 16 hours.' },
    { q: 'What happens if I am late?', a: 'Tap each step when you really do it. For the autolyse and when the starter goes in, the app asks when you did it. The steps after move to match. If you are running behind, it can offer to shorten the fridge time to keep your bake time, down to the 8 hour minimum.' },
    { q: 'What about the clocks changing?', a: 'Plans are built from real elapsed time and checked against your local clock, so a plan that crosses the clocks going forward or back is still right.' },
    { q: 'Where is my log stored?', a: 'In this browser on this device only. Use Save a copy on the Log tab to keep a file you can restore somewhere else.' },
    { q: 'Can I change the recipe?', a: 'Not yet. You can choose one or two loaves, regular or large, and the hydration, but the rest of the recipe is fixed.' }
];

export function Help() {
    return (
        <div class="help">
            <h2>Help</h2>
            <p>Pick <strong>Start a loaf now</strong> to see the range of times and pull the levers, or <strong>I want bread at…</strong> to say when you want to carve and let the app work backwards. When you are happy, press <strong>Start this plan</strong>. It then tells you what is next and how long you are free.</p>
            <p>Times are estimates: they assume the dough temperature you give. Use the plan as a guide, and trust how the dough looks and feels.</p>
            <h2>Questions and answers</h2>
            {FAQ.map((f) => (
                <details class="faq"><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
        </div>
    );
}
