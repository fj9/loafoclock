import { addLocalDays, atLocalTime, getWaking, isAwake, localDayNumber, startOfLocalDay, type Plan, type Zone } from '../domain/plan';
import { clockOf, lengthOf, shortDate } from './format';

interface Row {
    key: string;
    label: string;
    at: number;
    /** When the row stands for several steps (the folds), the moment of each. */
    times?: number[];
    /** The moment the wait after this row starts. For the folds it is the last one. */
    from: number;
    needsYou: boolean;
}

type Wait = 'rising' | 'bulk' | 'fridge' | 'proof' | 'bake' | 'cool' | 'plain';

const WAIT_NAMES: Partial<Record<Wait, string>> = { rising: 'Starter rising', bulk: 'Bulk', fridge: 'In the fridge', proof: 'Proofing', bake: 'Baking', cool: 'Cooling' };

/** The steps in order, with the four folds folded into one row. */
function rowsOf(plan: Plan): Row[] {
    const rows: Row[] = [];
    for (const s of plan.steps) {
        if (s.id === 'fold1') {
            const times = (['fold1', 'fold2', 'fold3', 'fold4'] as const).map((id) => plan.byId[id]);
            rows.push({ key: 'folds', label: 'Four folds', at: s.at, times, from: times[3]!, needsYou: true });
        } else if (!s.id.startsWith('fold')) {
            rows.push({ key: s.id, label: s.label, at: s.at, from: s.at, needsYou: s.needsYou });
        }
    }
    return rows;
}

/** Which stretch of the bake a wait belongs to, from where its middle falls. */
function waitAt(plan: Plan, mid: number): Wait {
    const b = plan.byId;
    if (mid >= b.feed && mid < b.starterIn) return 'rising';
    if (mid >= b.starterIn && mid < plan.bulkEnd) return 'bulk';
    // The dough stays in the fridge while the oven heats up, until it goes in.
    if (mid >= b.fridge && mid < b.bake) return plan.levers.fridge.kind === 'none' ? 'proof' : 'fridge';
    if (mid >= b.bake && mid < b.out) return 'bake';
    if (mid >= b.out && mid < b.carve) return 'cool';
    return 'plain';
}

/** How long a whole wait lasts. The fridge is counted until the loaf goes into the oven, as the fridge lever is. */
function totalOf(plan: Plan, wait: Wait): number {
    const b = plan.byId;
    switch (wait) {
        case 'rising': return b.starterIn - b.feed;
        case 'bulk': return plan.bulkEnd - b.starterIn;
        case 'fridge': case 'proof': return b.bake - b.fridge;
        case 'bake': return b.out - b.bake;
        case 'cool': return b.carve - b.out;
        default: return 0;
    }
}

/** True if any of the stretch from `a` to `b` falls in sleeping hours. */
function overlapsSleep(a: number, b: number, zone: Zone): boolean {
    const { fromMin, toMin } = getWaking();
    for (let d = addLocalDays(startOfLocalDay(a, zone), -1, zone); d < b; d = addLocalDays(d, 1, zone)) {
        const from = atLocalTime(d, toMin, zone);
        const to = atLocalTime(addLocalDays(d, 1, zone), fromMin, zone);
        if (from < b && a < to) return true;
    }
    return false;
}

/** A wait is drawn taller the longer it is, but not in proportion: a night in the fridge must not fill the screen. */
const heightOf = (ms: number) => Math.round(18 + 22 * Math.log2(1 + ms / 3_600_000));

interface Props {
    plan: Plan;
    zone?: Zone;
    /** Shows a Now line if it falls inside the bake. */
    now?: number;
}

/**
 * The bake as a list down the page: the time on the left, a rail of coloured waits in the middle and what to do
 * on the right. Days are named where they start, and a moon marks a wait that runs into the night.
 */
export function RailTimeline({ plan, zone, now }: Props) {
    const rows = rowsOf(plan);
    const first = rows[0]!.at;
    const showNow = now !== undefined && now > first && now < plan.readyToCarve;

    return (
        <ol class="rail" aria-label="The bake, step by step">
            {rows.map((r, i) => {
                const nextRow = rows[i + 1];
                const newDay = i === 0 || localDayNumber(r.at, zone) !== localDayNumber(rows[i - 1]!.at, zone);
                const asleep = r.needsYou && (r.times ?? [r.at]).some((t) => !isAwake(t, zone));
                const wait = nextRow ? waitAt(plan, (r.from + nextRow.at) / 2) : 'plain';
                const length = nextRow ? nextRow.at - r.from : 0;
                // A wait is named once, on its first stretch, with its whole length.
                const prevWait = i > 0 ? waitAt(plan, (rows[i - 1]!.from + r.at) / 2) : null;
                const shown = totalOf(plan, wait);
                const height = heightOf(length);
                const night = nextRow ? overlapsSleep(r.from, nextRow.at, zone) : false;
                const name = prevWait === wait ? undefined : WAIT_NAMES[wait];
                const nowAt = showNow && nextRow && now! >= r.from && now! < nextRow.at ? Math.round(((now! - r.from) / length) * height) : null;
                return (
                    <li key={r.key} class={r.key === 'carve' ? 'rl-end' : ''}>
                        {newDay && <p class="rl-day">{shortDate(r.at, now ?? plan.byId.feed, zone)}</p>}
                        <div class="rl-row">
                            <span class="rl-time">{clockOf(r.at, zone)}</span>
                            <span class="rl-node"><i class={`rl-dot${asleep ? ' asleep' : ''}`} /></span>
                            <span class="rl-label">
                                {r.label}
                                {r.times && <span class="rl-sub">{r.times.map((t) => clockOf(t, zone)).join(' · ')}</span>}
                                {asleep && <span class="rl-sub warn">In your sleeping hours</span>}
                            </span>
                        </div>
                        {nextRow && (
                            <div class="rl-gap" style={{ height: `${height}px` }}>
                                <span class="rl-time rl-moon">{night && <><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M11 8.5A5 5 0 0 1 5.5 3a5 5 0 1 0 5.5 5.5z" fill="currentColor" /></svg><span class="sr-only">Asleep</span></>}</span>
                                <span class="rl-node"><i class={`rl-bar ${wait}`} /></span>
                                <span class="rl-wait">
                                    {name ? `${name} · ${lengthOf(shown)}` : ''}
                                    {night && <span class="rl-sub">Asleep for part of this</span>}
                                </span>
                                {nowAt !== null && <span class="rl-now" style={{ top: `${nowAt}px` }}><b>Now</b></span>}
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
