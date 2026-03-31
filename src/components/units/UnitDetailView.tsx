'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Contractor, StageTemplate, UnitDetailFull, UnitStageWithTemplate, UpdateStageInput, UnitStatus, DeliveryStatus } from '@/types/database'
import { updateUnitStage, addUnitUpdate, updateUnit } from '@/actions/units'
import { computeUnitProgress, formatDate, isOverdue, STAGE_STATUS_LABELS, DELIVERY_STATUS_LABELS, UNIT_STATUS_LABELS, cn } from '@/lib/utils'
import { UnitStatusBadge, StageStatusBadge, DeliveryStatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, ChevronDown, ChevronUp, Truck, MessageSquare,
  Calendar, User, AlertTriangle, CheckCircle2, CircleDot,
} from 'lucide-react'

interface Props {
  unit:           UnitDetailFull
  contractors:    Pick<Contractor, 'id' | 'company_name' | 'trade_type'>[]
  stageTemplates: Pick<StageTemplate, 'id' | 'name' | 'trade_type' | 'sort_order'>[]
}

export function UnitDetailView({ unit, contractors, stageTemplates }: Props) {
  const router = useRouter()
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [savingStage,   setSavingStage]   = useState<string | null>(null)
  const [comment,       setComment]       = useState('')
  const [submitting,    setSubmitting]    = useState(false)

  const stages = [...(unit.unit_stages ?? [])].sort(
    (a, b) => a.stage_templates.sort_order - b.stage_templates.sort_order
  )
  const progress = computeUnitProgress(stages)

  async function handleStageUpdate(stageId: string, data: UpdateStageInput) {
    setSavingStage(stageId)
    await updateUnitStage(stageId, unit.id, data)
    setSavingStage(null)
    router.refresh()
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    await addUnitUpdate(unit.id, comment.trim())
    setComment('')
    setSubmitting(false)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Unit header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">Unit {unit.unit_number}</h1>
            <UnitStatusBadge status={unit.status} />
          </div>
          <p className="text-muted-foreground mt-0.5">
            {unit.buildings?.name}
            {unit.buildings?.address && (
              <span className="text-xs ml-1.5">· {unit.buildings.address}</span>
            )}
          </p>
          {unit.floor_plan && (
            <p className="text-sm text-muted-foreground mt-1">{unit.floor_plan}</p>
          )}
        </div>
        <div className="text-right space-y-1">
          {unit.target_completion_date && (
            <div className={cn(
              'flex items-center gap-1 text-sm justify-end',
              isOverdue(unit.target_completion_date) ? 'text-red-600 font-medium' : 'text-muted-foreground'
            )}>
              <Calendar className="h-3.5 w-3.5" />
              Target: {formatDate(unit.target_completion_date)}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Card className="shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-semibold tabular-nums">{progress.percent}%</span>
          </div>
          <ProgressBar progress={progress} showLabel={false} size="md" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{progress.completed} of {progress.total} stages done</span>
            {progress.activeStage && (
              <span>Current: <span className="font-medium text-foreground">{progress.activeStage.name}</span></span>
            )}
          </div>
        </CardContent>
      </Card>

      {unit.notes && (
        <Card className="shadow-none border-l-4 border-l-amber-400">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Note:</span> {unit.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Stages */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Stages</h2>
        {stages.map((stage, index) => (
          <StageRow
            key={stage.id}
            stage={stage}
            contractors={contractors}
            expanded={expandedStage === stage.id}
            onToggle={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
            onUpdate={(data) => handleStageUpdate(stage.id, data)}
            saving={savingStage === stage.id}
          />
        ))}
      </div>

      {/* Updates feed */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Updates
          {unit.unit_updates?.length > 0 && (
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
              {unit.unit_updates.length}
            </span>
          )}
        </h2>

        {/* Add comment */}
        <form onSubmit={handleComment}>
          <div className="flex gap-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add an update or note..."
              className="min-h-[70px] resize-none"
            />
          </div>
          <div className="mt-2 flex justify-end">
            <Button type="submit" size="sm" disabled={submitting || !comment.trim()}>
              {submitting ? 'Posting...' : 'Post Update'}
            </Button>
          </div>
        </form>

        {/* Feed */}
        {unit.unit_updates?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No updates yet.</p>
        ) : (
          <div className="space-y-2">
            {(unit.unit_updates as any[]).map((update) => (
              <Card key={update.id} className="shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                        {update.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm font-medium">{update.profiles?.full_name ?? 'Unknown'}</span>
                      {update.unit_stages && (
                        <span className="text-xs text-muted-foreground">
                          on {update.unit_stages.stage_templates?.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(update.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{update.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Stage row — collapsible edit form
// ============================================================

interface StageRowProps {
  stage:       UnitStageWithTemplate
  contractors: Pick<Contractor, 'id' | 'company_name' | 'trade_type'>[]
  expanded:    boolean
  onToggle:    () => void
  onUpdate:    (data: UpdateStageInput) => void
  saving:      boolean
}

function StageRow({ stage, contractors, expanded, onToggle, onUpdate, saving }: StageRowProps) {
  const [localStatus,         setLocalStatus]         = useState(stage.status)
  const [localContractorId,   setLocalContractorId]   = useState(stage.contractor_id ?? '')
  const [localDueDate,        setLocalDueDate]        = useState(stage.due_date ?? '')
  const [localNotes,          setLocalNotes]          = useState(stage.notes ?? '')
  const [localBlocker,        setLocalBlocker]        = useState(stage.blocker_reason ?? '')
  const [localDelivReq,       setLocalDelivReq]       = useState(stage.delivery_required)
  const [localDelivStatus,    setLocalDelivStatus]    = useState(stage.delivery_status ?? '')
  const [localMaterials,      setLocalMaterials]      = useState(stage.materials_list ?? '')
  const [localDelivNotes,     setLocalDelivNotes]     = useState(stage.delivery_notes ?? '')
  const [localDelivDue,       setLocalDelivDue]       = useState(stage.delivery_due_date ?? '')

  const isDone   = localStatus === 'done'
  const isBlocked = localStatus === 'blocked'

  function handleSave() {
    onUpdate({
      status:             localStatus,
      contractor_id:      localContractorId || null,
      due_date:           localDueDate || null,
      notes:              localNotes || null,
      blocker_reason:     localBlocker || null,
      delivery_required:  localDelivReq,
      delivery_status:    (localDelivStatus as DeliveryStatus) || null,
      materials_list:     localMaterials || null,
      delivery_notes:     localDelivNotes || null,
      delivery_due_date:  localDelivDue || null,
    })
  }

  const statusColors: Record<string, string> = {
    done:        'bg-emerald-500',
    in_progress: 'bg-blue-500',
    blocked:     'bg-red-500',
    not_started: 'bg-slate-300',
  }

  return (
    <Card className={cn('shadow-none overflow-hidden', isDone && 'opacity-60')}>
      <button
        className="w-full text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Status dot */}
          <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', statusColors[localStatus])} />

          {/* Stage info */}
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{stage.stage_templates.name}</span>
            <StageStatusBadge status={localStatus} />
            {localContractorId && (
              <span className="text-xs text-muted-foreground">
                {contractors.find((c) => c.id === localContractorId)?.company_name}
              </span>
            )}
            {localDelivReq && localDelivStatus && localDelivStatus !== 'not_needed' && (
              <DeliveryStatusBadge status={localDelivStatus as DeliveryStatus} />
            )}
            {localDueDate && localStatus !== 'done' && (
              <span className={cn(
                'text-xs',
                isOverdue(localDueDate) ? 'text-red-600 font-medium' : 'text-muted-foreground'
              )}>
                Due {formatDate(localDueDate)}
              </span>
            )}
          </div>

          {/* Expand icon */}
          <div className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-muted/20">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={localStatus} onValueChange={(v) => setLocalStatus(v as any)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STAGE_STATUS_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contractor */}
            <div className="space-y-1.5">
              <Label className="text-xs">Contractor</Label>
              <Select value={localContractorId} onValueChange={setLocalContractorId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {contractors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date</Label>
              <Input
                type="date"
                value={localDueDate}
                onChange={(e) => setLocalDueDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {isBlocked && (
            <div className="space-y-1.5">
              <Label className="text-xs text-red-600">Blocker Reason</Label>
              <Input
                value={localBlocker}
                onChange={(e) => setLocalBlocker(e.target.value)}
                placeholder="What is blocking this stage?"
                className="h-8 text-xs border-red-200"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Stage notes..."
              className="min-h-[60px] text-xs resize-none"
            />
          </div>

          {/* Delivery section */}
          <div className="rounded-md border bg-background p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">Delivery Required</span>
              </div>
              <Switch
                checked={localDelivReq}
                onCheckedChange={setLocalDelivReq}
              />
            </div>

            {localDelivReq && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery Status</Label>
                  <Select value={localDelivStatus} onValueChange={setLocalDelivStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DELIVERY_STATUS_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery Due Date</Label>
                  <Input
                    type="date"
                    value={localDelivDue}
                    onChange={(e) => setLocalDelivDue(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Materials List</Label>
                  <Textarea
                    value={localMaterials}
                    onChange={(e) => setLocalMaterials(e.target.value)}
                    placeholder="e.g. toilet, trim kit, supply lines..."
                    className="min-h-[50px] text-xs resize-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Delivery Notes</Label>
                  <Input
                    value={localDelivNotes}
                    onChange={(e) => setLocalDelivNotes(e.target.value)}
                    placeholder="Any special delivery instructions..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
