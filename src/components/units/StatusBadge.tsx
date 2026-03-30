import { cn, unitStatusVariant, stageStatusVariant, deliveryStatusVariant,
  UNIT_STATUS_LABELS, STAGE_STATUS_LABELS, DELIVERY_STATUS_LABELS } from '@/lib/utils'
import type { UnitStatus, StageStatus, DeliveryStatus } from '@/types/database'

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', unitStatusVariant(status))}>
      {UNIT_STATUS_LABELS[status]}
    </span>
  )
}

export function StageStatusBadge({ status }: { status: StageStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', stageStatusVariant(status))}>
      {STAGE_STATUS_LABELS[status]}
    </span>
  )
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus | null }) {
  if (!status || status === 'not_needed') return null
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', deliveryStatusVariant(status))}>
      {DELIVERY_STATUS_LABELS[status]}
    </span>
  )
}
