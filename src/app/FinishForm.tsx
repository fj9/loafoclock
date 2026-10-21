import { useState } from 'preact/hooks';
import { OUTCOMES, type LogEntry, type Outcome } from '../domain/bakeLog';

interface Props {
    /** What is known about the bake already. */
    entry: Omit<LogEntry, 'outcome' | 'notes'>;
    onSave: (entry: LogEntry) => void;
    onSkip: () => void;
}

/** How did it turn out? Saved to the log with the feed ratio used. */
export function FinishForm({ entry, onSave, onSkip }: Props) {
    const [outcome, setOutcome] = useState<Outcome | undefined>();
    const [notes, setNotes] = useState('');
    return (
        <section class="panel" aria-label="Log this bake">
            <h2>How did it turn out?</h2>
            <div class="chips" role="group" aria-label="Outcome">
                {OUTCOMES.map((o) => (
                    <button type="button" class={`chip${outcome === o ? ' on' : ''}`} aria-pressed={outcome === o} onClick={() => setOutcome(outcome === o ? undefined : o)}>{o}</button>
                ))}
            </div>
            <div class="lever">
                <label for="log-notes">Notes</label>
                <textarea id="log-notes" rows={3} value={notes} onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)} />
            </div>
            <button type="button" class="btn big-btn" onClick={() => onSave({ ...entry, notes, ...(outcome ? { outcome } : {}) })}>Save to the log</button>
            <p><button type="button" class="link" onClick={onSkip}>Skip the log</button></p>
        </section>
    );
}
