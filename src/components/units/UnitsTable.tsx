'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Building, Contractor, UnitStageWithTemplate, UnitWithBuilding } from '@/types/database'
import { computeUnitProgress, formatDate, isOverdue, TRADE_LABELS } from '@/lib/utils'
import { UnitStatusBadge, DeliveryStatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { CreateUnitDialog } from './CreateUnitDialog'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type UnitRow = UnitWithBuilding & { unit_stages: UnitStageWithTemplate[] }

interface Props {
  units:             UnitRow[]
  buildings:         Pick<Building, 'id' | 'name'>[]
  contractors:       Pick<Contractor, 'id' | 'company_name' | 'trade_type'>[]
  lockedBuildingId?: string   // when set, hides building filter/column
}

const STAGE_STATUSES = ['not_started', 'in_progress', 'blocked', 'done'] as const
const UNIT_STATUSES  = ['not_started', 'in_progress', 'on_hold', 'blocked', 'ready_to_rent', 'complete'] as const
const DELIVERY_STATUSES = ['pending', 'scheduled', 'delivered'] as const

export function UnitsTable({ units, buildings, contractors, lockedBuildingId }: Props) {
  const [search,           setSearch]           = useState('')
  const [buildingFilter,   setBuildingFilter]   = useState('all')
  const [statusFilter,     setStatusFilter]     = useState('all')
  const [deliveryFilter,   setDeliveryFilter]   = useState('all')
  const [tradeFilter,      setTradeFilter]      = useState('all')
  const [createOpen,       setCreateOpen]       = useState(false)

  const filtered = units.filter((unit) => {
    if (search && !unit.unit_number.toLowerCase().includes(search.toLowerCase())) return false
    if (buildingFilter !== 'all' && unit.building_id !== buildingFilter) return false
    if (statusFilter   !== 'all' && unit.status !== statusFilter) return false

    if (deliveryFilter !== 'all') {
      const hasDelivery = (unit.unit_stages ?? []).some(
        (s) => s.delivery_required && s.delivery_status === deliveryFilter
      )
      if (!hasDelivery) return false
    }

    if (tradeFilter !== 'all') {
      const activeStage = (unit.unit_stages ?? [])
        .filter((s) => s.status !== 'done')
        .sort((a, b) => a.stage_templates.sort_order - b.stage_templates.sort_order)[0]
      if (!activeStage || activeStage.stage_templates.trade_type !== tradeFilter) return false
    }

    return true
  })

  const allTrades = Array.from(
    new Set(units.flatMap((u) => u.unit_stages?.map((s) => s.stage_templates.trade_type) ?? []))
  ).sort()

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search unit #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {!lockedBuildingId && (
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {UNIT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tradeFilter} onValueChange={setTradeFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Trades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            {allTrades.map((t) => (
              <SelectItem key={t} value={t}>{TRADE_LABELS[t] ?? t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Delivery" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Deliveries</SelectItem>
            {DELIVERY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Unit
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Unit</th>
                {!lockedBuildingId && (
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Building</th>
                )}
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Floor Plan</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Progress</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Active Stage</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Contractor</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden xl:table-cell">Target Date</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden xl:table-cell">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No units match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((unit) => {
                  const stages   = unit.unit_stages ?? []
                  const progress = computeUnitProgress(stages)
                  const sorted   = [...stages].sort((a, b) => a.stage_templates.sort_order - b.stage_templates.sort_order)
                  const active   = sorted.find((s) => s.status !== 'done')
                  const contractor = active?.contractors ?? null
                  const pendingDelivery = stages.find(
                    (s) => s.delivery_required && ['pending','scheduled'].includes(s.delivery_status ?? '')
                  )
                  const overdue = unit.target_completion_date && isOverdue(unit.target_completion_date)

                  return (
                    <tr
                      key={unit.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/units/${unit.id}`} className="font-medium hover:text-primary transition-colors">
                          {unit.unit_number}
                        </Link>
                      </td>
                      {!lockedBuildingId && (
                        <td className="px-4 py-3 text-muted-foreground">
                          {unit.buildings?.name ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {unit.floor_plan ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <UnitStatusBadge status={unit.status} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell w-32">
                        <ProgressBar progress={progress} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {active ? (
                          <span className="text-xs">{active.stage_templates.name}</span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">All Done</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        <span className="text-xs">{contractor?.company_name ?? '—'}</span>
                      </td>
                      <td className={cn(
                        'px-4 py-3 text-xs hidden xl:table-cell',
                        overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                      )}>
                        {formatDate(unit.target_completion_date)}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {pendingDelivery ? (
                          <DeliveryStatusBadge status={pendingDelivery.delivery_status ?? null} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {units.length} units
      </p>

      <CreateUnitDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        buildings={buildings}
      />
    </div>
  )
}
