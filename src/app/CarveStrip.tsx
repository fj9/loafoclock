import { addLocalDays, getWaking, localDayNumber, minutesOfDay, startOfLocalDay, type Zone } from '../domain/plan';
import { dayLabel } from './format';

export interface Mark { at: number; n: number; on?: boolean }

interface Props {
    feedAt: number;
    now: number;
    zone?: Zone;
    marks: Mark[];
}

const pct = (min: number) => `${(min / 1440) * 100}%`;

/** One bar per day, from the feed to the last carve: where the feed is, your sleeping hours, and when each plan is ready. */
export function CarveStrip({ feedAt, now, zone, marks }: Props) {
    const first = startOfLocalDay(feedAt, zone);
    const last = Math.max(feedAt, ...marks.map((m) => m.at));
    const count = localDayNumber(last, zone) - localDayNumber(first, zone) + 1;
    const days = Array.from({ length: count }, (_, i) => addLocalDays(first, i, zone));
    const w = getWaking();
    return (
        <div class="carve-strip" role="img" aria-label="When each plan is ready to carve">
            {days.map((d) => {
                const dayNo = localDayNumber(d, zone);
                return (
                    <div class="strip-row">
                        <span class="strip-day">{dayLabel(d, now, zone)}</span>
                        <div class="strip-track">
                            <span class="strip-night" style={{ left: 0, width: pct(w.fromMin) }} />
                            <span class="strip-night" style={{ left: pct(w.toMin), right: 0 }} />
                            {localDayNumber(feedAt, zone) === dayNo && <span class="strip-feed" style={{ left: pct(minutesOfDay(feedAt, zone)) }} />}
                            {marks.filter((m) => localDayNumber(m.at, zone) === dayNo).map((m) => (
                                <span class={`strip-dot${m.on ? ' on' : ''}`} style={{ left: pct(minutesOfDay(m.at, zone)) }}>{m.n}</span>
                            ))}
                        </div>
                    </div>
                );
            })}
            <div class="strip-row strip-axis" aria-hidden="true"><span /><span><span>12am</span><span>6am</span><span>12pm</span><span>6pm</span></span></div>
            <p class="strip-legend"><span><i class="k-feed" />your feed</span><span><i class="k-night" />sleeping</span></p>
        </div>
    );
}
