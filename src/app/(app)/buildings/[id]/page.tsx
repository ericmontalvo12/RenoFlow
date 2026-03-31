import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UnitsTable } from '@/components/units/UnitsTable'
import type { UnitStageWithTemplate, UnitWithBuilding } from '@/types/database'
import { ArrowLeft, MapPin } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function BuildingDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: building }, { data: units }, { data: contractors }] = await Promise.all([
    supabase
      .from('buildings')
      .select('id, name, address')
      .eq('id', id)
      .single(),
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
      .eq('building_id', id)
      .order('unit_number'),
    supabase
      .from('contractors')
      .select('id, company_name, trade_type')
      .order('company_name'),
  ])

  if (!building) notFound()

  const unitList = (units ?? []) as Array<
    UnitWithBuilding & { unit_stages: UnitStageWithTemplate[] }
  >

  return (
    <div className="p-6 space-y-5">
      {/* Back nav */}
      <Link
        href="/buildings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Buildings
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{building.name}</h1>
        {building.address && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {building.address}
          </div>
        )}
      </div>

      {/* Units table scoped to this building — hide the building filter column */}
      <UnitsTable
        units={unitList}
        buildings={[building]}
        contractors={contractors ?? []}
        lockedBuildingId={id}
      />
    </div>
  )
}
