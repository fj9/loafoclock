import { HOUR, addLocalDays, atLocalTime, startOfLocalDay, type Zone } from '../domain/plan';
import { QuickTimePicker, type Nudge } from './QuickTimePicker';

interface Props {
    /** When the starter was fed. */
    fedAt: number;
    now: number;
    zone?: Zone;
    onChange: (fedAt: number) => void;
}

const NUDGES: readonly Nudge[] = [
    { label: '−1 h', spoken: 'One hour earlier', by: -HOUR }, { label: '−15 min', spoken: '15 minutes earlier', by: -15 * 60_000 },
    { label: '+15 min', spoken: '15 minutes later', by: 15 * 60_000 }, { label: '+1 h', spoken: 'One hour later', by: HOUR }
];

/** "When did you feed your starter?": quick answers, and an exact time on request. It goes back to the start of yesterday. */
export function FedTimePicker({ fedAt, now, zone, onChange }: Props) {
    const yesterday = addLocalDays(startOfLocalDay(now, zone), -1, zone);
    // Only the answers that make sense now, and none twice.
    const chips = [
        { label: 'Just now', at: now }, { label: '1 h ago', at: now - HOUR }, { label: '2 h ago', at: now - 2 * HOUR },
        { label: '4 h ago', at: now - 4 * HOUR }, { label: 'Last night, 8 pm', at: atLocalTime(yesterday, 20 * 60, zone) }
    ].filter((c, i, all) => c.at >= yesterday && c.at <= now && all.findIndex((o) => o.at === c.at) === i);

    return (
        <QuickTimePicker
            value={fedAt} now={now} zone={zone} onChange={onChange} chips={chips} nudges={NUDGES}
            earliest={yesterday} earliestMessage="You can go back to the start of yesterday." wheelDayOf={now}
            chipsLabel="When you fed it" wheelLabel="Time you fed your starter"
        />
    );
}
