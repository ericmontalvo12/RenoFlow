import { createClient } from '@/lib/supabase/server'
import { SummaryGenerator } from '@/components/summaries/SummaryGenerator'
import { FileText } from 'lucide-react'

export default async function SummariesPage() {
  const supabase = await createClient()

  const [{ data: buildings }, { data: contractors }, { data: unitStages }] = await Promise.all([
    supabase.from('buildings').select('id, name').order('name'),
    supabase.from('contractors').select('id, company_name, trade_type').order('company_name'),
    supabase
      .from('unit_stages')
      .select(`
        *,
        units(id, unit_number, building_id, buildings(id, name)),
        stage_templates(id, name, trade_type, sort_order),
        contractors(id, company_name, trade_type)
      `)
      .order('updated_at', { ascending: false }),
  ])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Summaries</h1>
      </div>
      <SummaryGenerator
        buildings={buildings ?? []}
        contractors={contractors ?? []}
        unitStages={unitStages ?? []}
      />
    </div>
  )
}
