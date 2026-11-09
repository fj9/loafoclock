import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { PlanFigure, PlanSettings } from './PlanFigure';

/** Handbook text. A worked example in it ({{planFigure ...}}) is drawn live, so it follows your clock, theme and text size. */
export function HtmlBody({ html }: { html: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>('.hb-figure') ?? []);
        const cards = Array.from(ref.current?.querySelectorAll<HTMLElement>('.hb-settings-fig') ?? []);
        for (const node of nodes) render(<PlanFigure spec={node.dataset.plan ?? ''} />, node);
        for (const node of cards) render(<PlanSettings spec={node.dataset.plan ?? ''} />, node);
        return () => { for (const node of [...nodes, ...cards]) render(null, node); };
    }, [html]);
    return <div class="hb-body" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
