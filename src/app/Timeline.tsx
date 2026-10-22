import { getWaking, isAwake, atLocalTime, addLocalDays, startOfLocalDay, partsOf, HOUR, type Plan, type StepId, type Zone } from '../domain/plan';
import { clockOf, weekdayOf } from './format';

const PX_PER_HOUR = 14;

/** Roughly how wide a label is, in pixels, at the chosen text size. */
const textScale = () => ({ large: 1.15, larger: 1.3 } as Record<string, number>)[globalThis.document?.documentElement.dataset.text ?? ''] ?? 1;
const labelWidth = (text: string, swatch: boolean) => Math.ceil(text.length * 6.6 * textScale()) + (swatch ? 16 : 0);

interface Label { text: string; left: number; width: number; swatch?: string }

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

    // A sleeping band is drawn only where it shows, and named if there is room.
    const sleepBand = (from: number, to: number) => {
        const a = Math.max(from, start);
        const z = Math.min(to, end);
        if (z <= a) return null;
        return (
            <div class="tl-sleep" style={{ left: `${x(a)}px`, width: `${x(z) - x(a)}px` }}>
                {x(z) - x(a) >= 56 * textScale() && <span>Asleep</span>}
            </div>
        );
    };

    const seg = (from: number, to: number, cls: string, label: string) => (
        <div class={`tl-seg ${cls}`} style={{ left: `${x(from)}px`, width: `${Math.max(0, x(to) - x(from))}px` }} title={label} />
    );
    const b = plan.byId;
    const noFridge = plan.levers.fridge.kind === 'none';

    // Labels go in one row under the bars. The ends come first, then each bar if its name fits;
    // anything that would touch another label is left out.
    const wanted: Label[] = [];
    const feedW = labelWidth('Feed', false);
    wanted.push({ text: 'Feed', left: x(b.feed) - 5, width: feedW });
    const carveW = labelWidth('Bake & carve', false);
    wanted.push({ text: 'Bake & carve', left: x(b.carve) + 7 - carveW, width: carveW });
    const bars: Array<[number, number, string, string]> = [
        [b.feed, b.starterIn, 'Starter rising', 'rising'], [b.starterIn, plan.bulkEnd, 'Bulk', 'bulk'],
        [b.fridge, b.ovenOn, noFridge ? 'Proof' : 'Fridge', noFridge ? 'proof' : 'fridge']
    ];
    for (const [from, to, text, swatch] of bars) {
        const w = labelWidth(text, true);
        if (x(to) - x(from) < w + 6) continue;
        wanted.push({ text, swatch, width: w, left: (x(from) + x(to)) / 2 - w / 2 });
    }
    const placed: Label[] = [];
    for (const l of wanted) {
        if (l.left < 0 || l.left + l.width > width) continue;
        if (placed.every((p) => l.left >= p.left + p.width + 8 || l.left + l.width + 8 <= p.left)) placed.push(l);
    }

    return (
        <div class="timeline">
            <div class="tl-scroll" tabIndex={0} role="region" aria-label="Timeline of the whole bake, scrolls sideways. The steps are listed below.">
                <div class="tl-track" role="img" aria-label="The bake from the first feed to ready to carve" style={{ width: `${width}px` }}>
                    {days.map((d) => {
                        const night = atLocalTime(d, getWaking().toMin, zone);
                        const morning = atLocalTime(d, getWaking().fromMin, zone);
                        return (
                            <>
                                {sleepBand(d, morning)}
                                {sleepBand(night, addLocalDays(d, 1, zone))}
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
                        const isFold = s.id.startsWith('fold');
                        return (
                            <div
                                key={s.id}
                                class={`tl-mark${asleep ? ' asleep' : ''}${isFold ? ' small' : ''}${s.id === 'carve' ? ' carve' : ''}`}
                                style={{ left: `${x(s.at)}px` }}
                                title={`${s.label}, ${clockOf(s.at, zone)}`}
                            >
                            </div>
                        );
                    })}
                    {placed.map((l) => (
                        <span class="tl-lab" style={{ left: `${l.left}px` }}>{l.swatch && <i class={`sw ${l.swatch}`} />}{l.text}</span>
                    ))}
                    {now !== undefined && now >= start && now <= end && (
                        <div class="tl-now" style={{ left: `${x(now)}px` }}><span>Now</span></div>
                    )}
                </div>
            </div>
        </div>
    );
}
