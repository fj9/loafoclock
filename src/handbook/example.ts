// The worked examples: a plan built by the planner from a few settings, written as "feed=08:00 wait=6 temp=24 fridge=10".
//   feed      the clock time of the first feed, on day 1
//   wait      hours from the feed to the starter going in (picks the feed ratio, as the app's slider does), or
//   ratio     the feed as 1:N:N, with delay (minutes after it is ready) instead of wait
//   temp      dough temperature in °C
//   fridge    hours in the fridge, or none
//   cooling   30 or 60 minutes (60 if left out)
//   loaves    1 or 2 (1 if left out); only the amounts change
import { DEFAULT_WAKING, STEP_ORDER, buildPlan, feedForWait, fitsWakingHours, leversAt, localDayNumber, type Levers, type Plan, type StepId } from '../domain/plan';
import examples from '../../content/handbook/examples.json';

export function parseExample(spec: string): Levers {
    const kv: Record<string, string> = {};
    for (const token of spec.split(/\s+/).filter(Boolean)) {
        const [key, value] = token.split('=');
        if (!key || value === undefined) throw new Error(`example "${spec}": "${token}" should be name=value`);
        kv[key] = value;
    }
    for (const key of ['feed', 'temp', 'fridge']) if (!kv[key]) throw new Error(`example "${spec}" needs ${key}=`);
    if (!kv.wait && !kv.ratio) throw new Error(`example "${spec}" needs wait= or ratio=`);
    const [h = 0, m = 0] = kv.feed!.split(':').map(Number);
    // A Monday in January, so no clock change falls inside it. The date is never shown: days are called day 1, day 2 and so on.
    const feed = new Date(2026, 0, 5, h, m).getTime();
    const feedChoice = kv.wait ? feedForWait(Number(kv.wait)) : { ratioN: Number(kv.ratio), starterDelayMin: Number(kv.delay ?? 0) };
    return leversAt(feed, {
        ...feedChoice,
        doughTemp: Number(kv.temp),
        fridge: kv.fridge === 'none' ? { kind: 'none' } : { kind: 'hours', hours: Number(kv.fridge) },
        cooling: kv.cooling === '30' ? 30 : 60,
        loaves: kv.loaves === '2' ? 2 : 1
    });
}

/** The plan for an example. It has to fit the usual waking hours (not the reader's own), so an example is never one the app would refuse. */
export function exampleFor(spec: string): Plan {
    const plan = buildPlan(parseExample(spec));
    if (!fitsWakingHours(plan, { waking: DEFAULT_WAKING })) throw new Error(`the example "${spec}" has a step in the sleeping hours`);
    return plan;
}

/** "Day 1", "Day 2": days are counted from the day of the first feed. */
export const dayName = (daysAfterFeed: number): string => `Day ${daysAfterFeed + 1}`;

/** "5:15 pm": a time written out for the text, whatever the clock setting. */
export function clockText(ms: number): string {
    const d = new Date(ms);
    const h = d.getHours();
    return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** The settings for a named example, from content/handbook/examples.json. */
export function exampleSpec(name: string): string {
    const spec = (examples as Record<string, string>)[name];
    if (!spec) throw new Error(`there is no example called "${name}"`);
    return spec;
}

/** "Day 2, 5:15 pm": when a step of a named example happens. */
export function exampleStepAt(name: string, step: string): string {
    if (!(STEP_ORDER as readonly string[]).includes(step)) throw new Error(`"${step}" is not a step`);
    const plan = exampleFor(exampleSpec(name));
    const at = plan.byId[step as StepId];
    return `${dayName(localDayNumber(at) - localDayNumber(plan.byId.feed))}, ${clockText(at)}`;
}

/** "5:15 pm": just the time of a step of a named example, for text that is already under a Day heading. */
export function exampleTimeAt(name: string, step: string): string {
    if (!(STEP_ORDER as readonly string[]).includes(step)) throw new Error(`"${step}" is not a step`);
    return clockText(exampleFor(exampleSpec(name)).byId[step as StepId]);
}

/** "36 h 30 min": how long a named example takes from the first feed to ready to carve. */
export function exampleLength(name: string): string {
    const plan = exampleFor(exampleSpec(name));
    const minutes = Math.round((plan.readyToCarve - plan.byId.feed) / 60_000);
    const h = Math.floor(minutes / 60), m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
}
