import { useEffect, useRef, useState } from 'preact/hooks';
import { getWaking, isAwake, atLocalTime, addLocalDays, startOfLocalDay, partsOf, HOUR, type Plan, type Zone } from '../domain/plan';
import { clockOf, lengthOf, weekdayOf } from './format';
import { layoutTimeline } from './timelineLayout';

/** Roughly how wide a label is, in pixels, at the chosen text size. */
const textScale = () => ({ large: 1.15, larger: 1.3 } as Record<string, number>)[globalThis.document?.documentElement.dataset.text ?? ''] ?? 1;
const labelWidth = (text: string, swatch: boolean) => Math.ceil(text.length * 6.6 * textScale()) + (swatch ? 16 : 0);

interface Label { text: string; left: number; width: number; swatch?: string; row?: number }

/** The fridge bar, snapped in the middle by a slanted gap: a long wait that is not drawn to scale. */
function SplitBar({ width }: { width: number }) {
    const h = 18, gap = 10, slant = 6, mid = width / 2;
    const left = `0,0 ${mid - gap / 2 + slant / 2},0 ${mid - gap / 2 - slant / 2},${h} 0,${h}`;
    const right = `${mid + gap / 2 + slant / 2},0 ${width},0 ${width},${h} ${mid + gap / 2 - slant / 2},${h}`;
    return (
        <svg class="tl-split" width={width} height={h} viewBox={`0 0 ${width} ${h}`} aria-hidden="true">
            <polygon points={left} /><polygon points={right} />
        </svg>
    );
}

interface Props {
    plan: Plan;
    zone?: Zone;
    /** Show a Now marker when it falls inside the timeline. */
    now?: number;
}

/**
 * The whole bake on one bar, from the first feed to ready to carve. It always fits the width:
 * a long stay in the fridge is folded into a labelled break, so the busy hours keep their detail.
 */
export function Timeline({ plan, zone, now }: Props) {
    const frame = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(340);
    useEffect(() => {
        const el = frame.current;
        if (!el) return;
        const measure = () => setWidth(Math.max(240, el.clientWidth || 340));
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const { start, end, pieces, x } = layoutTimeline(plan, width);
    const b = plan.byId;
    const noFridge = plan.levers.fridge.kind === 'none';
    const brk = pieces.find((p) => p.collapsed);

    // Midnight to midnight for the day labels and the sleeping bands
    const days: number[] = [];
    for (let d = startOfLocalDay(start, zone); d < end; d = addLocalDays(d, 1, zone)) days.push(d);

    // A sleeping band is drawn only where it shows (not inside the break), and named if there is room.
    const sleepBand = (from: number, to: number) => pieces.filter((p) => !p.collapsed).map((p) => {
        const a = Math.max(from, p.from);
        const z = Math.min(to, p.to);
        if (z <= a) return null;
        const w = x(z) - x(a);
        return <div class="tl-sleep" style={{ left: `${x(a)}px`, width: `${w}px` }}>{w >= 56 * textScale() && <span>Asleep</span>}</div>;
    });

    // Where a day label goes: its first visible moment. A day that starts inside the break is named after it.
    const dayLabels: Array<{ d: number; left: number }> = [];
    for (const d of days) {
        const next = addLocalDays(d, 1, zone);
        const p = pieces.find((q) => next > q.from && d < q.to)!;
        const left = p.collapsed ? (p.to < next && p.to < end ? p.x1 : null) : x(Math.max(d, start));
        if (left === null) continue;
        if (dayLabels.length && left < dayLabels[dayLabels.length - 1]!.left + 46) continue;
        if (left + 46 > width) continue;
        dayLabels.push({ d, left });
    }

    const seg = (from: number, to: number, cls: string, label: string) => (
        <div class={`tl-seg ${cls}`} style={{ left: `${x(from)}px`, width: `${Math.max(0, x(to) - x(from))}px` }} title={label} />
    );

    // Labels go under the bars: the end first, then each bar's name at its start. A label that
    // would touch another goes on a second row; one that fits nowhere is left out.
    const wanted: Label[] = [];
    const carveW = labelWidth('Bake and carve', false);
    wanted.push({ text: 'Bake and carve', left: x(b.carve) + 7 - carveW, width: carveW });
    const bars: Array<[number, number, string, string]> = [
        [b.feed, b.starterIn, 'Starter rising', 'rising'], [b.starterIn, plan.bulkEnd, 'Bulk', 'bulk'],
        [b.fridge, b.ovenOn, noFridge ? 'Proof' : 'Fridge', noFridge ? 'proof' : 'fridge']
    ];
    for (const [from, to, text, swatch] of bars) {
        const w = labelWidth(text, true);
        if (x(to) - x(from) < w * 0.7) continue; // the bar is too short to name
        wanted.push({ text, swatch, width: w, left: x(from) + 2 });
    }
    const placed: Label[] = [];
    for (const l of wanted) {
        const left = Math.min(Math.max(l.left, 2), width - l.width - 2);
        for (const row of [0, 1]) {
            const clear = placed.every((p) => p.row !== row || left >= p.left + p.width + 8 || left + l.width + 8 <= p.left);
            if (clear) { placed.push({ ...l, left, row }); break; }
        }
    }

    return (
        <div class="timeline" ref={frame}>
            <div class="tl-scroll">
                <div class="tl-track" role="img" aria-label="The bake from the first feed to ready to carve. The steps are listed below." style={{ width: `${width}px` }}>
                    {days.map((d) => (
                        <>
                            {sleepBand(d, atLocalTime(d, getWaking().fromMin, zone))}
                            {sleepBand(atLocalTime(d, getWaking().toMin, zone), addLocalDays(d, 1, zone))}
                        </>
                    ))}
                    {dayLabels.map(({ d, left }) => (
                        <div class="tl-day" style={{ left: `${left}px` }}>{weekdayOf(d + 12 * HOUR, zone)} {partsOf(d + 12 * HOUR, zone).day}</div>
                    ))}
                    {seg(b.feed, b.starterIn, 'rising', 'Starter rising')}
                    {seg(b.starterIn, plan.bulkEnd, 'bulk', 'Bulk fermentation')}
                    {noFridge ? seg(b.fridge, b.ovenOn, 'proof', 'Proofing') : brk ? (
                        <div class="tl-break" style={{ left: `${brk.x0}px`, width: `${brk.x1 - brk.x0}px` }} title="In the fridge">
                            <span class="tl-break-time">{lengthOf(b.ovenOn - b.fridge)}</span>
                            <SplitBar width={brk.x1 - brk.x0} />
                        </div>
                    ) : seg(b.fridge, b.ovenOn, 'fridge', 'In the fridge')}
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
                            />
                        );
                    })}
                    {placed.map((l) => (
                        <span class="tl-lab" style={{ left: `${l.left}px`, top: `${88 + (l.row ?? 0) * 17}px` }}>{l.swatch && <i class={`sw ${l.swatch}`} />}{l.text}</span>
                    ))}
                    {now !== undefined && now >= start && now <= end && (
                        <div class="tl-now" style={{ left: `${x(now)}px` }}><span>Now</span></div>
                    )}
                </div>
            </div>
        </div>
    );
}
