import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UnitStatusBadge } from '@/components/units/StatusBadge'
import { ProgressBar } from '@/components/units/ProgressBar'
import { computeUnitProgress, formatDate, UNIT_STATUS_LABELS } from '@/lib/utils'
import type { UnitStageWithTemplate, UnitWithBuilding } from '@/types/database'
import {
  Building2, CheckCircle2, CircleDot, AlertTriangle, Clock,
  Truck, Activity, LayoutDashboard,
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: units },
    { data: recentUpdates },
    { data: buildings },
  ] = await Promise.all([
    supabase
      .from('units')
      .select(`*, buildings(id, name), unit_stages(*, stage_templates(id, name, trade_type, sort_order))`)
      .order('updated_at', { ascending: false }),
    supabase
      .from('unit_updates')
      .select(`*, profiles(id, full_name), units(id, unit_number, buildings(name))`)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('buildings').select('id, name').order('name'),
  ])

  const unitList = (units ?? []) as Array<
    UnitWithBuilding & { unit_stages: UnitStageWithTemplate[] }
  >

  // Summary stats
  const readyToRent   = unitList.filter((u) => u.status === 'ready_to_rent').length
  const inProgress    = unitList.filter((u) => u.status === 'in_progress').length
  const onHold        = unitList.filter((u) => u.status === 'on_hold').length
  const blocked       = unitList.filter((u) => u.status === 'blocked').length
  const activeUnits   = unitList.filter((u) => !['complete','ready_to_rent'].includes(u.status)).length

  const overdueStages = unitList.flatMap((u) =>
    (u.unit_stages ?? []).filter(
      (s) => s.due_date && new Date(s.due_date) < new Date() && s.status !== 'done'
    )
  ).length

  const deliveryRequired = unitList.flatMap((u) =>
    (u.unit_stages ?? []).filter(
      (s) => s.delivery_required && ['pending','scheduled'].includes(s.delivery_status ?? '')
    )
  ).length

  const stats = [
    { label: 'Ready to Rent',      value: readyToRent,      icon: CheckCircle2,  color: 'text-emerald-600' },
    { label: 'In Progress',        value: inProgress,       icon: CircleDot,     color: 'text-blue-600'   },
    { label: 'On Hold',            value: onHold,           icon: Clock,         color: 'text-amber-600'  },
    { label: 'Blocked',            value: blocked,          icon: AlertTriangle, color: 'text-red-600'    },
    { label: 'Overdue Stages',     value: overdueStages,    icon: Clock,         color: 'text-red-500'    },
    { label: 'Deliveries Needed',  value: deliveryRequired, icon: Truck,         color: 'text-amber-600'  },
    { label: 'Active Units',       value: activeUnits,      icon: Activity,      color: 'text-slate-600'  },
  ]

  // Units needing attention: blocked or overdue
  const attentionUnits = unitList.filter((u) => {
    const hasOverdue = (u.unit_stages ?? []).some(
      (s) => s.due_date && new Date(s.due_date) < new Date() && s.status !== 'done'
    )
    return u.status === 'blocked' || hasOverdue
  }).slice(0, 6)

  // Per-building summary
  const buildingMap = new Map<string, { name: string; total: number; done: number; blocked: number }>()
  for (const unit of unitList) {
    const bid = unit.building_id
    const bname = unit.buildings?.name ?? 'Unknown'
    if (!buildingMap.has(bid)) buildingMap.set(bid, { name: bname, total: 0, done: 0, blocked: 0 })
    const b = buildingMap.get(bid)!
    b.total++
    if (['ready_to_rent','complete'].includes(unit.status)) b.done++
    if (unit.status === 'blocked') b.blocked++
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Units needing attention */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Needs Attention</h2>
          {attentionUnits.length === 0 ? (
            <Card className="shadow-none">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No units need immediate attention.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {attentionUnits.map((unit) => {
                const progress = computeUnitProgress(unit.unit_stages ?? [])
                return (
                  <Link key={unit.id} href={`/units/${unit.id}`}>
                    <Card className="shadow-none hover:shadow-sm transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">Unit {unit.unit_number}</span>
                              <span className="text-xs text-muted-foreground">{unit.buildings?.name}</span>
                            </div>
                            <div className="mt-1.5">
                              <ProgressBar progress={progress} />
                            </div>
                          </div>
                          <UnitStatusBadge status={unit.status} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Building summary */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">By Building</h2>
          <Card className="shadow-none">
            <CardContent className="p-0">
              {buildingMap.size === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No buildings yet.</p>
              ) : (
                <div className="divide-y">
                  {Array.from(buildingMap.values()).map((b) => (
                    <div key={b.name} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{b.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums ml-2">{b.done}/{b.total}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: b.total > 0 ? `${Math.round((b.done / b.total) * 100)}%` : '0%' }}
                        />
                      </div>
                      {b.blocked > 0 && (
                        <p className="text-xs text-red-600 mt-1">{b.blocked} blocked</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
        <Card className="shadow-none">
          <CardContent className="p-0">
            {(!recentUpdates || recentUpdates.length === 0) ? (
              <p className="p-4 text-sm text-muted-foreground">No recent updates.</p>
            ) : (
              <div className="divide-y">
                {recentUpdates.map((update: any) => (
                  <div key={update.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{update.profiles?.full_name ?? 'Unknown'}</span>
                          <span>on</span>
                          <Link href={`/units/${update.unit_id}`} className="text-primary hover:underline">
                            Unit {update.units?.unit_number}
                          </Link>
                          <span className="text-muted-foreground/60">·</span>
                          <span>{update.units?.buildings?.name}</span>
                        </div>
                        <p className="mt-0.5 text-sm line-clamp-2 text-foreground/80">{update.body}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(update.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
