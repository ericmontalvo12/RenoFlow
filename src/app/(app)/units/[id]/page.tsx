import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UnitDetailView } from '@/components/units/UnitDetailView'
import type { UnitDetailFull } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
}

export default async function UnitDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: unit } = await supabase
    .from('units')
    .select(`
      *,
      buildings(id, name, address),
      unit_stages(
        *,
        stage_templates(id, name, trade_type, sort_order),
        contractors(id, company_name, trade_type)
      ),
      unit_updates(
        *,
        profiles(id, full_name),
        unit_stages(id, stage_templates(name)),
        unit_update_attachments(*)
      )
    `)
    .eq('id', id)
    .single()

  if (!unit) notFound()

  const [{ data: contractors }, { data: stageTemplates }] = await Promise.all([
    supabase.from('contractors').select('id, company_name, trade_type').order('company_name'),
    supabase.from('stage_templates').select('id, name, trade_type, sort_order').eq('is_active', true).order('sort_order'),
  ])

  // Sort updates newest first
  const unitData = {
    ...unit,
    unit_updates: (unit.unit_updates ?? []).sort(
      (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
  } as UnitDetailFull

  return (
    <UnitDetailView
      unit={unitData}
      contractors={contractors ?? []}
      stageTemplates={stageTemplates ?? []}
    />
  )
}
