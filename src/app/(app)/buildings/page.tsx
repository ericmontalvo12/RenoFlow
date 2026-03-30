import { createClient } from '@/lib/supabase/server'
import { BuildingsView } from '@/components/buildings/BuildingsView'
import { Building2 } from 'lucide-react'

export default async function BuildingsPage() {
  const supabase = await createClient()

  // Fetch buildings with unit counts
  const { data: buildings } = await supabase
    .from('buildings')
    .select('*, units(id)')
    .order('name')

  const buildingsWithCount = (buildings ?? []).map((b) => ({
    ...b,
    unit_count: Array.isArray(b.units) ? b.units.length : 0,
    units: undefined,
  }))

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Buildings</h1>
        <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {buildingsWithCount.length}
        </span>
      </div>
      <BuildingsView buildings={buildingsWithCount} />
    </div>
  )
}
