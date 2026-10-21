declare const __APP_VERSION__: string;
const REPO = 'https://github.com/fj9/loafoclock';

export function About() {
    return (
        <div class="about">
            <section class="panel">
                <h2>About Loaf O'Clock</h2>
                <p><em>It's always Loaf O'Clock somewhere.</em></p>
                <p>Hi, I'm Frankie, (fj9 on GitHub). Loaf O'Clock is a free sourdough planner that shows how feed, temperature and the fridge move your bake, so you can fit it around your day.</p>
            </section>
            <section class="panel">
                <h2>Why I made it</h2>
                <p>Sourdough that fits your life, not the other way round. Most apps quietly shuffle the schedule for you. I wanted one that shows you the levers, and what each one does to your day.</p>
                <p>Sourdough is mostly waiting, and the hard part is the timing: when to feed your starter so it's ready when you are, when you need to be in the house, and when you're free.</p>
                <p>Then I wanted my mum to be able to use it too. So the words are plain, the tricky terms have a little hint, and the plan tells you when to be in the house.</p>
            </section>
            <section class="panel">
                <h2>Who it's for</h2>
                <p>Home bakers who make sourdough regularly and would like the timing taken care of. People new to sourdough who find the jargon off-putting. Anyone who has ever set an alarm for the middle of the night to feed a starter.</p>
                <p>It follows one recipe: a white-flour loaf with a little honey and olive oil, baked from cold in a Dutch oven.</p>
            </section>
            <section class="panel">
                <h2>How much to trust the times</h2>
                <p>They're estimates. A warm kitchen is faster and a cool one slower. Use the plan as a guide, and trust how the dough looks and feels.</p>
            </section>
            <section class="panel">
                <h2>Your data</h2>
                <p>Everything you log, and your bake in progress, stays on your device. There's no account, no tracking, and nothing is sent anywhere.</p>
            </section>
            <section class="panel">
                <h2>Thanks and credits</h2>
                <p>The recipe began with a sourdough guide tea towel by <a href="https://www.stuartgardiner.com" target="_blank" rel="noopener noreferrer">Stuart Gardiner</a>. I'm not affiliated with him.</p>
                <p>The code is on <a href={REPO} target="_blank" rel="noopener noreferrer">GitHub</a> if you'd like to take a look.</p>
                <p><strong>Licences.</strong> The code is open source under the <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">MIT licence</a>, copyright fj9. The headings use the Alfa Slab One font, under the <a href="https://openfontlicense.org" target="_blank" rel="noopener noreferrer">SIL Open Font Licence</a>. Making it work offline relies on Workbox, which is MIT licensed too.</p>
                <p>If you find it useful and fancy saying thanks, you can <a href="https://ko-fi.com/fjnine" target="_blank" rel="noopener noreferrer">tip me on Ko-fi</a>. It's entirely optional, and everything stays free either way.</p>
                <p class="hint">Version {__APP_VERSION__}</p>
            </section>
        </div>
    );
}
