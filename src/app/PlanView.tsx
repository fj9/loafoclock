import { PlanDetail, type PlanDetailProps } from './PlanDetail';
import { PlanDetailRail } from './PlanDetailRail';

/** The classic Plan page, or the New plan page with the rail timeline. Both plan the same bake. */
export type Layout = 'classic' | 'rail';

export function PlanView({ layout, ...props }: PlanDetailProps & { layout?: Layout }) {
    return layout === 'rail' ? <PlanDetailRail {...props} /> : <PlanDetail {...props} />;
}
