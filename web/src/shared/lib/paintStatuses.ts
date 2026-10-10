// Paint statuses, matching the Postgres enum paint_status (docs/plan.md).
export const paintStatuses = ['not_painted', 'pre_painted', 'hand_painted'] as const
export type PaintStatus = (typeof paintStatuses)[number]

export const paintStatusLabels: Record<PaintStatus, string> = {
  not_painted: 'Not painted',
  pre_painted: 'Pre-painted',
  hand_painted: 'Hand-painted',
}
