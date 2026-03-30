'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const contractorSchema = z.object({
  company_name: z.string().min(1),
  contact_name: z.string().optional(),
  trade_type:   z.string().min(1),
  phone:        z.string().optional(),
  email:        z.string().email().optional().or(z.literal('')),
  notes:        z.string().optional(),
})

export async function createContractor(formData: FormData) {
  const parsed = contractorSchema.safeParse({
    company_name: formData.get('company_name'),
    contact_name: formData.get('contact_name') || undefined,
    trade_type:   formData.get('trade_type'),
    phone:        formData.get('phone') || undefined,
    email:        formData.get('email') || undefined,
    notes:        formData.get('notes') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('contractors').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/contractors')
  return { success: true }
}

export async function updateContractor(id: string, formData: FormData) {
  const parsed = contractorSchema.safeParse({
    company_name: formData.get('company_name'),
    contact_name: formData.get('contact_name') || undefined,
    trade_type:   formData.get('trade_type'),
    phone:        formData.get('phone') || undefined,
    email:        formData.get('email') || undefined,
    notes:        formData.get('notes') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('contractors').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/contractors')
  return { success: true }
}

export async function deleteContractor(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('contractors').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/contractors')
  return { success: true }
}
