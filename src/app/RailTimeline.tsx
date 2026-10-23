import { isAwake, localDayNumber, type Plan, type Zone } from '../domain/plan';
import { clockOf, lengthOf, shortDate } from './format';
import { asleepLabel, bedLabel, nightsIn, wakeLabel } from './night';

interface Row {
    key: string;
    label: string;
    at: number;
    needsYou: boolean;
}

type Wait = 'rising' | 'bulk' | 'fridge' | 'proof' | 'bake' | 'cool' | 'plain';

const WAIT_NAMES: Partial<Record<Wait, string>> = { rising: 'Starter rising', bulk: 'Bulk', fridge: 'In the fridge', proof: 'Proofing', bake: 'Baking', cool: 'Cooling' };

/** Every step in order, each fold on its own row. */
const rowsOf = (plan: Plan): Row[] => plan.steps.map((s) => ({ key: s.id, label: s.label, at: s.at, needsYou: s.needsYou }));

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

/** True if this moment is in sleeping hours. */
const nightAt = (t: number, zone: Zone) => nightsIn(t, t + 1, zone).length > 0;

/** A night band this tall has room for bedtime at the top and getting up at the bottom; a shorter one gets a single label; a very short one none. */
const TWO_LABELS_PX = 44;
const ONE_LABEL_PX = 26;

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
 * on the right. Days are named where they start, and the night is a tinted band behind the waits that run into it.
 */
export function RailTimeline({ plan, zone, now }: Props) {
    const rows = rowsOf(plan);
    const first = rows[0]!.at;
    const showNow = now !== undefined && now > first && now < plan.readyToCarve;

    // Which pieces of the night band are drawn where, so that each piece rounds its corners only where the band
    // really begins or ends, and runs straight into its neighbour where the band carries on.
    const newDayAt = (i: number) => i === 0 || localDayNumber(rows[i]!.at, zone) !== localDayNumber(rows[i - 1]!.at, zone);
    const nightsOf = rows.map((r, i) => (rows[i + 1] ? nightsIn(r.at, rows[i + 1]!.at, zone) : []));
    const headerTint = rows.map((r, i) => newDayAt(i) && nightAt(r.at, zone));
    const rowTint = rows.map((r) => nightAt(r.at, zone));
    const gapTopTint = (i: number) => nightsOf[i]!.some((n) => n.from === rows[i]!.at);
    const gapBottomTint = (i: number) => i < rows.length - 1 && nightsOf[i]!.some((n) => n.to === rows[i + 1]!.at);
    const nextTint = (i: number) => (newDayAt(i + 1) ? headerTint[i + 1] : rowTint[i + 1]) ?? false;
    const edges = (tintedAbove: boolean, tintedBelow: boolean) => `${tintedAbove ? '' : ' round-top'}${tintedBelow ? '' : ' round-bottom'}`;

    return (
        <ol class="rail" aria-label="The bake, step by step">
            {rows.map((r, i) => {
                const nextRow = rows[i + 1];
                const newDay = newDayAt(i);
                const asleep = r.needsYou && !isAwake(r.at, zone);
                const wait = nextRow ? waitAt(plan, (r.at + nextRow.at) / 2) : 'plain';
                const length = nextRow ? nextRow.at - r.at : 0;
                // A wait is named once, on its first stretch, with its whole length.
                const prevWait = i > 0 ? waitAt(plan, (rows[i - 1]!.at + r.at) / 2) : null;
                const shown = totalOf(plan, wait);
                const height = heightOf(length);
                const nights = nextRow ? nightsIn(r.at, nextRow.at, zone) : [];
                const name = prevWait === wait ? undefined : WAIT_NAMES[wait];
                const nowAt = showNow && nextRow && now! >= r.at && now! < nextRow.at ? Math.round(((now! - r.at) / length) * height) : null;
                return (
                    <li key={r.key} class={r.key === 'carve' ? 'rl-end' : ''}>
                        {newDay && <p class={`rl-day${headerTint[i] ? ` in-night${edges(i > 0 && gapBottomTint(i - 1), true)}` : ''}`}>{shortDate(r.at, now ?? plan.byId.feed, zone)}</p>}
                        <div class={`rl-row${rowTint[i] ? ` in-night${edges(newDay ? headerTint[i]! : i > 0 && gapBottomTint(i - 1), nextRow ? gapTopTint(i) : false)}` : ''}`}>
                            <span class="rl-time">{clockOf(r.at, zone)}</span>
                            <span class="rl-node"><i class={`rl-dot${asleep ? ' asleep' : ''}`} /></span>
                            <span class="rl-label">
                                {r.label}
                                {asleep && <span class="rl-sub warn">In your sleeping hours</span>}
                            </span>
                        </div>
                        {nextRow && (
                            <div class="rl-gap" style={{ height: `${height}px` }}>
                                <span class="rl-time" />
                                <span class="rl-node"><i class={`rl-bar ${wait}`} /></span>
                                <span class="rl-wait">
                                    {name ? `${name} · ${lengthOf(shown)}` : ''}
                                    {nights.map((n) => <span class="sr-only">Asleep from {clockOf(n.bed, zone)} to {clockOf(n.wake, zone)}.</span>)}
                                </span>
                                {nights.map((n) => {
                                    const top = Math.round(((n.from - r.at) / length) * height);
                                    const tall = Math.round(((n.to - n.from) / length) * height);
                                    const whole = n.from === n.bed && n.to === n.wake;
                                    const showBed = n.from === n.bed && tall >= TWO_LABELS_PX;
                                    const showWake = n.to === n.wake && tall >= TWO_LABELS_PX;
                                    const showOne = whole && tall >= ONE_LABEL_PX && tall < TWO_LABELS_PX;
                                    return (
                                        <span class={`rl-night${n.from === r.at && rowTint[i] ? ' cut-top' : ''}${n.to === nextRow.at && nextTint(i) ? ' cut-bottom' : ''}`} style={{ top: `${top}px`, height: `${tall}px` }} aria-hidden="true">
                                            {showBed && <span class="bed">{bedLabel(n, zone)}</span>}
                                            {showWake && <span class="wake">{wakeLabel(n, zone)}</span>}
                                            {showOne && <span class="bed">{asleepLabel(n, zone)}</span>}
                                        </span>
                                    );
                                })}
                                {nowAt !== null && <span class="rl-now" style={{ top: `${nowAt}px` }}><b>Now</b></span>}
                            </div>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
