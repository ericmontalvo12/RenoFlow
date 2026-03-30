'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const buildingSchema = z.object({
  name:    z.string().min(1, 'Name is required'),
  address: z.string().optional(),
})

export async function createBuilding(formData: FormData) {
  const parsed = buildingSchema.safeParse({
    name:    formData.get('name'),
    address: formData.get('address') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('buildings').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/buildings')
  revalidatePath('/units')
  return { success: true }
}

export async function updateBuilding(id: string, formData: FormData) {
  const parsed = buildingSchema.safeParse({
    name:    formData.get('name'),
    address: formData.get('address') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('buildings').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/buildings')
  revalidatePath('/units')
  return { success: true }
}

export async function deleteBuilding(id: string) {
  const supabase = await createClient()
  // Check for units before deleting
  const { count } = await supabase
    .from('units')
    .select('id', { count: 'exact', head: true })
    .eq('building_id', id)

  if ((count ?? 0) > 0) {
    return { error: `Cannot delete — this building has ${count} unit(s). Remove or reassign them first.` }
  }

  const { error } = await supabase.from('buildings').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/buildings')
  revalidatePath('/units')
  return { success: true }
}
