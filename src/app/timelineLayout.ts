// Where things go on the timeline. The long wait in the fridge is folded into a short break so
// the whole bake fits the width of a phone and the busy hours keep their detail.
import { HOUR, type Plan } from '../domain/plan';

/** A fridge stretch at least this long is folded into a break. */
export const MIN_BREAK_HOURS = 6;
/** How wide the break is drawn, in pixels. */
export const BREAK_PX = 74;

export interface Piece {
    from: number;
    to: number;
    x0: number;
    x1: number;
    /** True for the folded stretch, drawn as a break. */
    collapsed: boolean;
}

export interface Layout {
    start: number;
    end: number;
    pieces: Piece[];
    /** Pixels per hour outside the break. */
    pxPerHour: number;
    /** Where a moment lands, in pixels from the left. Inside the break it is placed in proportion. */
    x: (ms: number) => number;
}

export function layoutTimeline(plan: Plan, width: number): Layout {
    const start = plan.byId.feed - HOUR;
    const end = plan.readyToCarve + HOUR;
    const from = plan.byId.fridge;
    const to = plan.byId.ovenOn;
    const fold = plan.levers.fridge.kind === 'hours' && (to - from) / HOUR >= MIN_BREAK_HOURS;

    const total = (end - start) / HOUR;
    const linear = fold ? total - (to - from) / HOUR : total;
    const pxPerHour = (width - (fold ? BREAK_PX : 0)) / linear;

    const pieces: Piece[] = [];
    let x = 0;
    const add = (a: number, b: number, collapsed: boolean) => {
        const w = collapsed ? BREAK_PX : ((b - a) / HOUR) * pxPerHour;
        pieces.push({ from: a, to: b, x0: x, x1: x + w, collapsed });
        x += w;
    };
    if (fold) { add(start, from, false); add(from, to, true); add(to, end, false); } else add(start, end, false);

    const at = (ms: number): number => {
        const p = pieces.find((q) => ms <= q.to) ?? pieces[pieces.length - 1]!;
        const t = Math.min(Math.max((ms - p.from) / (p.to - p.from), 0), 1);
        return p.x0 + t * (p.x1 - p.x0);
    };
    return { start, end, pieces, pxPerHour, x: at };
}
