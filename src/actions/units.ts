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
  status:                 z.enum(['not_started','in_progress','on_hold','blocked','ready_to_rent','complete']).optional(),
  floor_plan:             z.string().optional(),
  hold_reason:            z.string().optional(),
  target_completion_date: z.string().optional(),
  notes:                  z.string().optional(),
})

export async function createUnit(formData: FormData) {
  const parsed = createUnitSchema.safeParse({
    building_id:            formData.get('building_id'),
    unit_number:            formData.get('unit_number'),
    floor_plan:             formData.get('floor_plan') || undefined,
    target_completion_date: formData.get('target_completion_date') || undefined,
    notes:                  formData.get('notes') || undefined,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('units').insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/units')
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

  // If marking done, set completed_at
  if (data.status === 'done') {
    updateData.completed_at = new Date().toISOString()
  } else if (data.status) {
    updateData.completed_at = null
  }

  // Sync delivery_status when delivery_required is toggled off
  if (data.delivery_required === false) {
    updateData.delivery_status = 'not_needed'
  }

  const { error } = await supabase.from('unit_stages').update(updateData).eq('id', stageId)
  if (error) return { error: error.message }

  // Recompute unit status
  await syncUnitStatus(unitId)

  revalidatePath(`/units/${unitId}`)
  revalidatePath('/units')
  return { success: true }
}

async function syncUnitStatus(unitId: string) {
  const supabase = await createClient()

  const { data: stages } = await supabase
    .from('unit_stages')
    .select('status')
    .eq('unit_id', unitId)

  if (!stages) return

  const allDone    = stages.every((s) => s.status === 'done')
  const anyBlocked = stages.some((s) => s.status === 'blocked')
  const anyInProgress = stages.some((s) => s.status === 'in_progress')
  const allNotStarted = stages.every((s) => s.status === 'not_started')

  let newStatus: UnitStatus = 'not_started'
  if (allDone)          newStatus = 'ready_to_rent'
  else if (anyBlocked)  newStatus = 'blocked'
  else if (anyInProgress) newStatus = 'in_progress'
  else if (!allNotStarted) newStatus = 'in_progress'

  await supabase.from('units').update({ status: newStatus }).eq('id', unitId)
}

export async function addUnitUpdate(unitId: string, body: string, stageId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('unit_updates').insert({
    unit_id:       unitId,
    unit_stage_id: stageId || null,
    author_id:     user.id,
    body,
  })

  if (error) return { error: error.message }

  revalidatePath(`/units/${unitId}`)
  return { success: true }
}
