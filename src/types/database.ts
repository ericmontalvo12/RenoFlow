// ============================================================
// Database Types — matches Supabase schema exactly
// ============================================================

export type UserRole = 'admin' | 'manager' | 'staff'

export type UnitStatus =
  | 'not_started'
  | 'in_progress'
  | 'waiting_material'
  | 'waiting_contractor'
  | 'blocked'
  | 'complete'
  | 'on_hold'

export type StageStatus =
  | 'not_started'
  | 'ready'
  | 'in_progress'
  | 'waiting_material'
  | 'waiting_contractor'
  | 'complete'
  | 'blocked'

export type DeliveryStatus = 'not_needed' | 'pending' | 'scheduled' | 'delivered'

export type TradeType =
  | 'demo'
  | 'plumbing'
  | 'electrical'
  | 'drywall'
  | 'cabinets'
  | 'flooring'
  | 'paint'
  | 'appliances'
  | 'cleaning'
  | 'final_punch'
  | string

// ============================================================
// Table row types
// ============================================================

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
}

export interface Building {
  id: string
  name: string
  address: string | null
  created_at: string
}

export interface Contractor {
  id: string
  company_name: string
  contact_name: string | null
  trade_type: TradeType
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
}

export interface StageTemplate {
  id: string
  name: string
  trade_type: TradeType
  sort_order: number
  is_active: boolean
  default_delivery_required: boolean
  created_at: string
}

export interface Unit {
  id: string
  building_id: string
  unit_number: string
  floor_plan: string | null
  status: UnitStatus
  hold_reason: string | null
  target_completion_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface UnitStage {
  id: string
  unit_id: string
  stage_template_id: string
  status: StageStatus
  contractor_id: string | null
  due_date: string | null
  completed_at: string | null
  blocker_reason: string | null
  notes: string | null
  delivery_required: boolean
  delivery_status: DeliveryStatus | null
  materials_list: string | null
  delivery_notes: string | null
  delivery_due_date: string | null
  updated_at: string
}

export interface UnitUpdate {
  id: string
  unit_id: string
  unit_stage_id: string | null
  author_id: string
  body: string
  created_at: string
}

export interface UnitUpdateAttachment {
  id: string
  unit_update_id: string
  file_url: string
  file_type: string | null
  created_at: string
}

// ============================================================
// Enriched / joined types for UI
// ============================================================

export interface UnitWithBuilding extends Unit {
  buildings: Pick<Building, 'id' | 'name'>
}

export interface UnitStageWithTemplate extends UnitStage {
  stage_templates: Pick<StageTemplate, 'id' | 'name' | 'trade_type' | 'sort_order'>
  contractors?: Pick<Contractor, 'id' | 'company_name' | 'trade_type'> | null
}

export interface UnitUpdateWithAuthor extends UnitUpdate {
  profiles: Pick<Profile, 'id' | 'full_name'>
  unit_update_attachments?: UnitUpdateAttachment[]
  unit_stages?: Pick<UnitStage, 'id'> & { stage_templates: Pick<StageTemplate, 'name'> } | null
}

export interface UnitDetailFull extends Unit {
  buildings: Pick<Building, 'id' | 'name' | 'address'>
  unit_stages: UnitStageWithTemplate[]
  unit_updates: UnitUpdateWithAuthor[]
}

// ============================================================
// Computed / derived types
// ============================================================

export interface UnitProgress {
  total: number
  completed: number
  percent: number
  activeStage: StageTemplate | null
  isBlocked: boolean
}

export interface UnitTableRow extends UnitWithBuilding {
  progress: UnitProgress
  activeContractor?: Pick<Contractor, 'company_name'> | null
  hasPendingDelivery: boolean
}

// ============================================================
// Form / input types
// ============================================================

export interface CreateUnitInput {
  building_id: string
  unit_number: string
  floor_plan?: string
  target_completion_date?: string
  notes?: string
}

export interface UpdateUnitInput {
  status?: UnitStatus
  floor_plan?: string
  hold_reason?: string
  target_completion_date?: string
  notes?: string
}

export interface UpdateStageInput {
  status?: StageStatus
  contractor_id?: string | null
  due_date?: string | null
  blocker_reason?: string | null
  notes?: string | null
  delivery_required?: boolean
  delivery_status?: DeliveryStatus | null
  materials_list?: string | null
  delivery_notes?: string | null
  delivery_due_date?: string | null
}

export interface CreateContractorInput {
  company_name: string
  contact_name?: string
  trade_type: TradeType
  phone?: string
  email?: string
  notes?: string
}

export interface CreateUpdateInput {
  unit_id: string
  unit_stage_id?: string | null
  body: string
}
