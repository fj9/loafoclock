import { useState } from 'preact/hooks';
import { TIPS, type TipKey } from '../domain/tips';

/** A small (i) button that opens a plain-English explanation. */
export function Tip({ name }: { name: TipKey }) {
    const [open, setOpen] = useState(false);
    const tip = TIPS[name];
    return (
        <span class="tip-wrap">
            <button type="button" class="info-btn" aria-label={`What is ${tip.label}?`} aria-expanded={open} onClick={() => setOpen(!open)}>i</button>
            {open && <span class="tip" role="note">{tip.text}</span>}
        </span>
    );
}
