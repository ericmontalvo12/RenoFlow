import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type {
  UnitStatus,
  StageStatus,
  DeliveryStatus,
  UnitStageWithTemplate,
  UnitProgress,
  StageTemplate,
} from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Status label maps
// ============================================================

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  not_started:  'Not Started',
  in_progress:  'In Progress',
  on_hold:      'On Hold',
  blocked:      'Blocked',
  ready_to_rent:'Ready to Rent',
  complete:     'Complete',
}

export const STAGE_STATUS_LABELS: Record<StageStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  blocked:     'Blocked',
  done:        'Done',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  not_needed: 'Not Needed',
  pending:    'Pending',
  scheduled:  'Scheduled',
  delivered:  'Delivered',
}

export const TRADE_LABELS: Record<string, string> = {
  demo:        'Demo',
  plumbing:    'Plumbing',
  electrical:  'Electrical',
  drywall:     'Drywall',
  cabinets:    'Cabinets',
  flooring:    'Flooring',
  paint:       'Paint',
  appliances:  'Appliances',
  cleaning:    'Cleaning',
  final_punch: 'Final Punch',
}

// ============================================================
// Color / variant helpers
// ============================================================

export function unitStatusVariant(status: UnitStatus) {
  const map: Record<UnitStatus, string> = {
    not_started:  'bg-slate-100 text-slate-600',
    in_progress:  'bg-blue-50 text-blue-700',
    on_hold:      'bg-amber-50 text-amber-700',
    blocked:      'bg-red-50 text-red-700',
    ready_to_rent:'bg-emerald-50 text-emerald-700',
    complete:     'bg-emerald-50 text-emerald-700',
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

export function stageStatusVariant(status: StageStatus) {
  const map: Record<StageStatus, string> = {
    not_started: 'bg-slate-100 text-slate-500',
    in_progress: 'bg-blue-50 text-blue-700',
    blocked:     'bg-red-50 text-red-700',
    done:        'bg-emerald-50 text-emerald-700',
  }
  return map[status] ?? 'bg-slate-100 text-slate-500'
}

export function deliveryStatusVariant(status: DeliveryStatus | null) {
  if (!status) return 'bg-slate-100 text-slate-500'
  const map: Record<DeliveryStatus, string> = {
    not_needed: 'bg-slate-100 text-slate-500',
    pending:    'bg-amber-50 text-amber-700',
    scheduled:  'bg-blue-50 text-blue-700',
    delivered:  'bg-emerald-50 text-emerald-700',
  }
  return map[status] ?? 'bg-slate-100 text-slate-500'
}

// ============================================================
// Progress calculation
// ============================================================

export function computeUnitProgress(stages: UnitStageWithTemplate[]): UnitProgress {
  if (!stages.length) {
    return { total: 0, completed: 0, percent: 0, activeStage: null, isBlocked: false }
  }

  const sorted = [...stages].sort(
    (a, b) => a.stage_templates.sort_order - b.stage_templates.sort_order
  )

  const total = sorted.length
  const completed = sorted.filter((s) => s.status === 'done').length
  const percent = Math.round((completed / total) * 100)
  const isBlocked = sorted.some((s) => s.status === 'blocked')

  const activeStageRow = sorted.find((s) => s.status !== 'done')
  const activeStage: StageTemplate | null = activeStageRow
    ? {
        id:                       activeStageRow.stage_templates.id,
        name:                     activeStageRow.stage_templates.name,
        trade_type:               activeStageRow.stage_templates.trade_type,
        sort_order:               activeStageRow.stage_templates.sort_order,
        is_active:                true,
        default_delivery_required: false,
        created_at:               '',
      }
    : null

  return { total, completed, percent, activeStage, isBlocked }
}

// ============================================================
// Date helpers
// ============================================================

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}
