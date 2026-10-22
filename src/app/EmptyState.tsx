import type { ComponentChildren } from 'preact';

interface Props {
    /** What is missing, in a few words: "No bake running". */
    title: string;
    /** One sentence on what to do about it. */
    children: ComponentChildren;
    /** A button, only if there is something to press. */
    action?: { label: string; onClick: () => void };
    /** Use "status" when it appears as the result of something you just did. */
    role?: 'status';
}

/** When there is nothing to show yet: a short heading, one sentence, and a button if there is something to do. */
export function EmptyState({ title, children, action, role }: Props) {
    return (
        <section class="panel empty-state" role={role}>
            <h2>{title}</h2>
            <p>{children}</p>
            {action && <button type="button" class="btn" onClick={action.onClick}>{action.label}</button>}
        </section>
    );
}
