import { isAwake, atLocalTime, addLocalDays, startOfLocalDay, partsOf, HOUR, type Plan, type StepId, type Zone } from '../domain/plan';
import { clockOf, weekdayOf } from './format';

const PX_PER_HOUR = 14;

const KEY_LABELS: Partial<Record<StepId, string>> = {
    feed: 'Feed', starterIn: 'Starter in', fridge: 'Fridge', bake: 'Bake', carve: 'Carve'
};

interface Props {
    plan: Plan;
    zone?: Zone;
    /** Show a Now marker when it falls inside the timeline. */
    now?: number;
}

/** The whole bake on one horizontal bar, from the first feed to ready to carve. */
export function Timeline({ plan, zone, now }: Props) {
    const start = plan.byId.feed - HOUR;
    const end = plan.readyToCarve + HOUR;
    const x = (ms: number) => ((ms - start) / HOUR) * PX_PER_HOUR;
    const width = x(end);

    // Midnight to midnight for the day labels, and 11 pm to 6 am for the sleeping bands
    const days: number[] = [];
    for (let d = startOfLocalDay(start, zone); d < end; d = addLocalDays(d, 1, zone)) days.push(d);

    const seg = (from: number, to: number, cls: string, label: string) => (
        <div class={`tl-seg ${cls}`} style={{ left: `${x(from)}px`, width: `${Math.max(0, x(to) - x(from))}px` }} title={label} />
    );
    const b = plan.byId;
    const noFridge = plan.levers.fridge.kind === 'none';

    return (
        <div class="timeline">
            <div class="tl-scroll" tabIndex={0} role="region" aria-label="Timeline of the whole bake, scrolls sideways. The steps are listed below.">
                <div class="tl-track" role="img" aria-label="The bake from the first feed to ready to carve" style={{ width: `${width}px` }}>
                    {days.map((d) => {
                        const night = atLocalTime(d, 23 * 60, zone);
                        const morning = atLocalTime(d, 6 * 60, zone);
                        return (
                            <>
                                <div class="tl-sleep" style={{ left: `${x(d)}px`, width: `${x(morning) - x(d)}px` }} />
                                <div class="tl-sleep" style={{ left: `${x(night)}px`, width: `${x(addLocalDays(d, 1, zone)) - x(night)}px` }} />
                                {Math.min(end, addLocalDays(d, 1, zone)) - Math.max(start, d) >= 3 * HOUR && (
                                    <div class="tl-day" style={{ left: `${Math.max(0, x(d))}px` }}>
                                        {weekdayOf(d + 12 * HOUR, zone)} {partsOf(d + 12 * HOUR, zone).day}
                                    </div>
                                )}
                            </>
                        );
                    })}
                    {seg(b.feed, b.starterIn, 'rising', 'Starter rising')}
                    {seg(b.starterIn, plan.bulkEnd, 'bulk', 'Bulk fermentation')}
                    {seg(b.fridge, b.ovenOn, noFridge ? 'proof' : 'fridge', noFridge ? 'Proofing' : 'In the fridge')}
                    {seg(b.bake, b.out, 'bake', 'Baking')}
                    {seg(b.out, b.carve, 'cool', 'Cooling')}
                    {plan.steps.map((s) => {
                        const asleep = s.needsYou && !isAwake(s.at, zone);
                        const key = KEY_LABELS[s.id];
                        const isFold = s.id.startsWith('fold');
                        return (
                            <div
                                key={s.id}
                                class={`tl-mark${asleep ? ' asleep' : ''}${isFold ? ' small' : ''}${s.id === 'carve' ? ' carve' : ''}`}
                                style={{ left: `${x(s.at)}px` }}
                                title={`${s.label}, ${clockOf(s.at, zone)}`}
                            >
                                {key && <span class="tl-label">{key}</span>}
                            </div>
                        );
                    })}
                    {now !== undefined && now >= start && now <= end && (
                        <div class="tl-now" style={{ left: `${x(now)}px` }}><span>Now</span></div>
                    )}
                </div>
            </div>
            <ul class="tl-key" aria-hidden="true">
                <li class="rising">Starter rising</li><li class="bulk">Bulk</li>
                <li class={noFridge ? 'proof' : 'fridge'}>{noFridge ? 'Proof' : 'Fridge'}</li>
                <li class="bake">Bake</li><li class="sleep">Asleep</li>
            </ul>
        </div>
    );
}
