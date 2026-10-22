import { useRef, useState } from 'preact/hooks';
import { exportLog, parseBackup, type LogEntry } from '../domain/bakeLog';
import { downloadText } from './download';
import { LOAF_SIZES, type LoafSize } from '../domain/recipe';

interface Props {
    entries: LogEntry[];
    onRepeat: (entry: LogEntry) => void;
    onRemove: (index: number) => void;
    /** Called with entries from a backup file or the first app's log. */
    onAdd: (entries: LogEntry[]) => void;
    /** Whether the first app has bakes that are not here yet. */
    oldCount: number;
    onImportOld: () => void;
}

const sizeLabel = (s: string) => LOAF_SIZES[s as LoafSize]?.label ?? s;

export function LogScreen({ entries, onRepeat, onRemove, onAdd, oldCount, onImportOld }: Props) {
    const file = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState('');

    const download = () => downloadText('loaf-oclock-log.json', exportLog(entries), 'application/json');
    const restore = async (f: File | undefined) => {
        if (!f) return;
        const parsed = parseBackup(await f.text());
        if (!parsed) { setMessage('That file is not a Loaf O\'Clock backup.'); return; }
        onAdd(parsed);
        setMessage(`Added ${parsed.length} bakes from the backup.`);
    };

    return (
        <div class="log">
            <h2>Your bakes</h2>
            {entries.length === 0 && <p class="hint">No bakes yet. When you finish a bake you can log how it went here.</p>}
            <ol class="log-list">
                {entries.map((e, i) => (
                    <li class="panel">
                        <h3>{new Date(e.date).toLocaleDateString()}{e.outcome ? ` · ${e.outcome}` : ''}</h3>
                        <p>{e.loaves} × {sizeLabel(e.size)}{e.hydration ? `, ${e.hydration}% hydration` : ''}</p>
                        <p class="hint">
                            {e.ratioN ? `Feed 1:${e.ratioN}:${e.ratioN}` : 'Feed not recorded'}
                            {e.doughTemp ? ` · dough ${e.doughTemp}°C` : ''}
                            {e.fridgeHours ? ` · fridge ${Math.round(e.fridgeHours * 10) / 10} h` : ''}
                        </p>
                        {e.notes && <p>{e.notes}</p>}
                        <button type="button" class="btn outline" onClick={() => onRepeat(e)}>Repeat this bake</button>{' '}
                        <button type="button" class="link" onClick={() => { if (confirm('Remove this bake from the log?')) onRemove(i); }}>Remove</button>
                    </li>
                ))}
            </ol>

            {oldCount > 0 && (
                <p class="panel">
                    The first Loaf O'Clock on this device has {oldCount} logged {oldCount === 1 ? 'bake' : 'bakes'}.{' '}
                    <button type="button" class="link" onClick={onImportOld}>Add them to this log</button>
                </p>
            )}

            <h3>Back up</h3>
            <p class="hint">Your log is kept in this browser only. Save a copy to keep it safe or move it to another device.</p>
            <div class="btn-row">
                <button type="button" class="btn outline" onClick={download} disabled={entries.length === 0}>Save a copy</button>
                <button type="button" class="btn outline" onClick={() => file.current?.click()}>Restore from a copy</button>
            </div>
            <input ref={file} type="file" accept="application/json" hidden aria-label="Backup file" onChange={(e) => restore((e.target as HTMLInputElement).files?.[0])} />
            {message && <p class="hint" role="status">{message}</p>}
        </div>
    );
}

