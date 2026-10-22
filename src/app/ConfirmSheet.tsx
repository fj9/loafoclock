import { useEffect, useRef } from 'preact/hooks';

interface Props {
    title: string;
    body?: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * An in-app "are you sure?". The browser's own confirm popup is blocked in some browsers and web
 * views, which would leave the button doing nothing. Focus starts on Cancel, Escape cancels.
 */
export function ConfirmSheet({ title, body, confirmLabel, onConfirm, onCancel }: Props) {
    const sheet = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const before = document.activeElement as HTMLElement | null;
        sheet.current?.querySelector<HTMLElement>('[data-cancel]')?.focus();
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('keydown', esc); before?.focus?.(); };
    }, [onCancel]);
    return (
        <div class="overlay" role="alertdialog" aria-modal="true" aria-label={title}>
            <div class="sheet" ref={sheet}>
                <h2>{title}</h2>
                {body && <p>{body}</p>}
                <div class="btn-row">
                    <button type="button" class="btn outline" data-cancel onClick={onCancel}>Cancel</button>
                    <button type="button" class="btn" onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}
