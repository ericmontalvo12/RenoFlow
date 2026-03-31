'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { UnitStatus, UpdateStageInput } from '@/types/database'

const createUnitSchema = z.object({
  building_id:            z.string().uuid(),
  unit_number:            z.string().min(1).max(20),
  floor_plan:             z.string().optional(),
  target_completion_date: z.string().optional(),
  notes:                  z.string().optional(),
})

const updateUnitSchema = z.object({
  status:                 z.enum(['not_started','in_progress','waiting_material','waiting_contractor','blocked','complete','on_hold']).optional(),
  floor_plan:             z.string().optional(),
  hold_reason:            z.string().optional(),
  target_completion_date: z.string().optional(),
  notes:                  z.string().optional(),
})

export async function createUnit(formData: FormData) {
  const raw = {
    building_id:            formData.get('building_id'),
    unit_number:            formData.get('unit_number'),
    floor_plan:             formData.get('floor_plan')             || undefined,
    target_completion_date: formData.get('target_completion_date') || undefined,
    notes:                  formData.get('notes')                  || undefined,
  }

  const parsed = createUnitSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('units').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/units')
  revalidatePath('/buildings')
  return { success: true }
}

export async function updateUnit(id: string, data: z.infer<typeof updateUnitSchema>) {
  const parsed = updateUnitSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('units').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/units')
  revalidatePath(`/units/${id}`)
  return { success: true }
}

export async function deleteUnit(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('units').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/units')
  return { success: true }
}

export async function updateUnitStage(stageId: string, unitId: string, data: UpdateStageInput) {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { ...data }

  // Set completed_at when marking complete
  if (data.status === 'complete') {
    updateData.completed_at = new Date().toISOString()
  } else if (data.status) {
    updateData.completed_at = null
  }

  // Auto-clear delivery when toggled off
  if (data.delivery_required === false) {
    updateData.delivery_status = 'not_needed'
  }

  const { error } = await supabase.from('unit_stages').update(updateData).eq('id', stageId)
  if (error) return { error: error.message }

  await syncUnitStatus(unitId)

  revalidatePath(`/units/${unitId}`)
  revalidatePath('/units')
  revalidatePath('/buildings')
  return { success: true }
}

async function syncUnitStatus(unitId: string) {
  const supabase = await createClient()

  const { data: stages } = await supabase
    .from('unit_stages')
    .select('status')
    .eq('unit_id', unitId)

  if (!stages || stages.length === 0) return

  // Check for on_hold — only manually set, never auto-derived
  const { data: unit } = await supabase
    .from('units')
    .select('status')
    .eq('id', unitId)
    .single()

  if (unit?.status === 'on_hold') return  // respect manual hold

  const allComplete          = stages.every((s) => s.status === 'complete')
  const anyBlocked           = stages.some((s)  => s.status === 'blocked')
  const anyWaitingMaterial   = stages.some((s)  => s.status === 'waiting_material')
  const anyWaitingContractor = stages.some((s)  => s.status === 'waiting_contractor')
  const anyInProgress        = stages.some((s)  => s.status === 'in_progress' || s.status === 'ready')
  const allNotStarted        = stages.every((s) => s.status === 'not_started')

  let newStatus: UnitStatus = 'not_started'

  if (allComplete)             newStatus = 'complete'
  else if (anyBlocked)         newStatus = 'blocked'
  else if (anyWaitingMaterial) newStatus = 'waiting_material'
  else if (anyWaitingContractor) newStatus = 'waiting_contractor'
  else if (anyInProgress)      newStatus = 'in_progress'
  else if (!allNotStarted)     newStatus = 'in_progress'

  await supabase.from('units').update({ status: newStatus }).eq('id', unitId)
}

export async function addUnitUpdate(unitId: string, body: string, stageId?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('unit_updates').insert({
    unit_id:       unitId,
    unit_stage_id: stageId ?? null,
    author_id:     user.id,
    body,
  })

  if (error) return { error: error.message }

  revalidatePath(`/units/${unitId}`)
  return { success: true }
}
