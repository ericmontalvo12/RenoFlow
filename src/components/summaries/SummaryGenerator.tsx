'use client'
import { useState, useMemo } from 'react'
import type { Building, Contractor } from '@/types/database'
import { TRADE_LABELS } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Copy, Check } from 'lucide-react'

interface Props {
  buildings:   Pick<Building, 'id' | 'name'>[]
  contractors: Pick<Contractor, 'id' | 'company_name' | 'trade_type'>[]
  unitStages:  any[]
}

export function SummaryGenerator({ buildings, contractors, unitStages }: Props) {
  const [tab, setTab] = useState<'contractor' | 'delivery'>('contractor')
  const [copied, setCopied] = useState(false)

  // Contractor summary filters
  const [cBuilding,    setCBuilding]    = useState('all')
  const [cTrade,       setCTrade]       = useState('all')
  const [cContractor,  setCContractor]  = useState('all')

  // Delivery summary filters
  const [dBuilding,    setDBuilding]    = useState('all')
  const [dTrade,       setDTrade]       = useState('all')
  const [dDelivStatus, setDDelivStatus] = useState('pending')

  const allTrades = Array.from(
    new Set(unitStages.map((s: any) => s.stage_templates?.trade_type).filter(Boolean))
  ).sort() as string[]

  // ============================================================
  // Contractor Summary logic
  // ============================================================
  const contractorSummaryText = useMemo(() => {
    let stages = unitStages.filter((s: any) => s.status !== 'complete')

    if (cBuilding !== 'all')   stages = stages.filter((s: any) => s.units?.building_id === cBuilding)
    if (cTrade    !== 'all')   stages = stages.filter((s: any) => s.stage_templates?.trade_type === cTrade)
    if (cContractor !== 'all') stages = stages.filter((s: any) => s.contractor_id === cContractor)

    if (stages.length === 0) return 'No matching units found for this filter.'

    // Group: contractor → building → stage name → units
    type StageGroup = { [stageName: string]: string[] }
    type BuildingGroup = { [buildingName: string]: StageGroup }
    type ContractorGroup = { [contractorName: string]: BuildingGroup }

    const grouped: ContractorGroup = {}

    for (const s of stages) {
      const contractorName = s.contractors?.company_name ?? 'Unassigned'
      const buildingName   = s.units?.buildings?.name ?? 'Unknown Building'
      const stageName      = s.stage_templates?.name ?? 'Unknown Stage'
      const unitNumber     = s.units?.unit_number ?? '?'
      const isBlocked      = s.status === 'blocked'
      const entry          = isBlocked && s.blocker_reason
        ? `Unit ${unitNumber} — BLOCKED: ${s.blocker_reason}`
        : `Unit ${unitNumber}`

      grouped[contractorName] ??= {}
      grouped[contractorName][buildingName] ??= {}
      grouped[contractorName][buildingName][stageName] ??= []
      grouped[contractorName][buildingName][stageName].push(entry)
    }

    const lines: string[] = []
    for (const [contractor, buildings] of Object.entries(grouped)) {
      lines.push(`${contractor}`)
      lines.push('─'.repeat(contractor.length))
      for (const [building, stageMap] of Object.entries(buildings)) {
        lines.push(`  ${building}`)
        for (const [stageName, units] of Object.entries(stageMap)) {
          lines.push(`    ${stageName}:`)
          for (const u of units) lines.push(`      · ${u}`)
        }
      }
      lines.push('')
    }

    return lines.join('\n').trim()
  }, [unitStages, cBuilding, cTrade, cContractor])

  // ============================================================
  // Delivery Summary logic
  // ============================================================
  const deliverySummaryText = useMemo(() => {
    let stages = unitStages.filter(
      (s: any) => s.delivery_required === true
    )

    if (dDelivStatus !== 'all') {
      stages = stages.filter((s: any) => s.delivery_status === dDelivStatus)
    } else {
      stages = stages.filter((s: any) => ['pending', 'scheduled'].includes(s.delivery_status ?? ''))
    }

    if (dBuilding !== 'all') stages = stages.filter((s: any) => s.units?.building_id === dBuilding)
    if (dTrade    !== 'all') stages = stages.filter((s: any) => s.stage_templates?.trade_type === dTrade)

    if (stages.length === 0) return 'No delivery items match this filter.'

    // Group by building
    type BuildingGroup = { [buildingName: string]: string[] }
    const grouped: BuildingGroup = {}

    for (const s of stages) {
      const buildingName = s.units?.buildings?.name ?? 'Unknown Building'
      const unitNumber   = s.units?.unit_number ?? '?'
      const stageName    = s.stage_templates?.name ?? 'Unknown Stage'
      const materials    = s.materials_list ? ` — ${s.materials_list}` : ''
      const delivDue     = s.delivery_due_date ? ` (by ${s.delivery_due_date})` : ''
      const status       = s.delivery_status ? ` [${s.delivery_status.toUpperCase()}]` : ''

      grouped[buildingName] ??= []
      grouped[buildingName].push(`Unit ${unitNumber} — ${stageName}${materials}${delivDue}${status}`)
    }

    const lines: string[] = []
    for (const [building, items] of Object.entries(grouped)) {
      lines.push(`${building}`)
      lines.push('─'.repeat(building.length))
      lines.push('  Delivery Required:')
      for (const item of items) lines.push(`    · ${item}`)
      lines.push('')
    }

    return lines.join('\n').trim()
  }, [unitStages, dBuilding, dTrade, dDelivStatus])

  const summaryText = tab === 'contractor' ? contractorSummaryText : deliverySummaryText

  async function handleCopy() {
    await navigator.clipboard.writeText(summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'contractor' | 'delivery')}>
      <TabsList>
        <TabsTrigger value="contractor">Contractor Summary</TabsTrigger>
        <TabsTrigger value="delivery">Delivery Summary</TabsTrigger>
      </TabsList>

      {/* Contractor Summary */}
      <TabsContent value="contractor" className="space-y-4 mt-4">
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1.5 min-w-[160px]">
                <Label className="text-xs">Building</Label>
                <Select value={cBuilding} onValueChange={setCBuilding}>
                  <SelectTrigger className="h-8 text-xs w-[180px]">
                    <SelectValue placeholder="All Buildings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-[140px]">
                <Label className="text-xs">Trade</Label>
                <Select value={cTrade} onValueChange={setCTrade}>
                  <SelectTrigger className="h-8 text-xs w-[160px]">
                    <SelectValue placeholder="All Trades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trades</SelectItem>
                    {allTrades.map((t) => <SelectItem key={t} value={t}>{TRADE_LABELS[t] ?? t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-[160px]">
                <Label className="text-xs">Contractor</Label>
                <Select value={cContractor} onValueChange={setCContractor}>
                  <SelectTrigger className="h-8 text-xs w-[200px]">
                    <SelectValue placeholder="All Contractors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Contractors</SelectItem>
                    {contractors.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <SummaryOutput text={contractorSummaryText} onCopy={handleCopy} copied={copied} />
      </TabsContent>

      {/* Delivery Summary */}
      <TabsContent value="delivery" className="space-y-4 mt-4">
        <Card className="shadow-none">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1.5 min-w-[160px]">
                <Label className="text-xs">Building</Label>
                <Select value={dBuilding} onValueChange={setDBuilding}>
                  <SelectTrigger className="h-8 text-xs w-[180px]">
                    <SelectValue placeholder="All Buildings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-[140px]">
                <Label className="text-xs">Trade</Label>
                <Select value={dTrade} onValueChange={setDTrade}>
                  <SelectTrigger className="h-8 text-xs w-[160px]">
                    <SelectValue placeholder="All Trades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Trades</SelectItem>
                    {allTrades.map((t) => <SelectItem key={t} value={t}>{TRADE_LABELS[t] ?? t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-[140px]">
                <Label className="text-xs">Delivery Status</Label>
                <Select value={dDelivStatus} onValueChange={setDDelivStatus}>
                  <SelectTrigger className="h-8 text-xs w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Pending + Scheduled</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                    <SelectItem value="scheduled">Scheduled Only</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <SummaryOutput text={deliverySummaryText} onCopy={handleCopy} copied={copied} />
      </TabsContent>
    </Tabs>
  )
}

function SummaryOutput({ text, onCopy, copied }: { text: string; onCopy: () => void; copied: boolean }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">Summary Output</span>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <pre className="p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground/80 max-h-[500px] overflow-y-auto">
          {text}
        </pre>
      </CardContent>
    </Card>
  )
}
