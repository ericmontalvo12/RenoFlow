import { createClient } from '@/lib/supabase/server'
import { UnitsTable } from '@/components/units/UnitsTable'
import type { UnitStageWithTemplate, UnitWithBuilding } from '@/types/database'
import { Building2 } from 'lucide-react'

export default async function UnitsPage() {
  const supabase = await createClient()

  const [{ data: units }, { data: buildings }, { data: contractors }] = await Promise.all([
    supabase
      .from('units')
      .select(`
        *,
        buildings(id, name),
        unit_stages(
          *,
          stage_templates(id, name, trade_type, sort_order),
          contractors(id, company_name, trade_type)
        )
      `)
      .order('created_at', { ascending: false }),
    supabase.from('buildings').select('id, name').order('name'),
    supabase.from('contractors').select('id, company_name, trade_type').order('company_name'),
  ])

  const unitList = (units ?? []) as Array<
    UnitWithBuilding & { unit_stages: UnitStageWithTemplate[] }
  >

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Units</h1>
        <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {unitList.length}
        </span>
      </div>
      <UnitsTable
        units={unitList}
        buildings={buildings ?? []}
        contractors={contractors ?? []}
      />
    </div>
  )
}
