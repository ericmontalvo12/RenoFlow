'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  Contractor, StageTemplate, UnitDetailFull,
  UnitStageWithTemplate, UpdateStageInput, StageStatus, DeliveryStatus,
} from '@/types/database'
import { updateUnitStage, addUnitUpdate } from '@/actions/units'
import {
  computeUnitProgress, formatDate, isOverdue,
  STAGE_STATUS_LABELS, DELIVERY_STATUS_LABELS,
  cn, stageStatusVariant, stageDotColor,
} from '@/lib/utils'
import { UnitStatusBadge, StageStatusBadge, DeliveryStatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, ChevronDown, ChevronUp, Truck, MessageSquare, Calendar,
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

  // Build a lookup: stage_id → latest update body for inline display
  const latestNoteByStage: Record<string, string> = {}
  for (const update of (unit.unit_updates as any[]) ?? []) {
    if (update.unit_stage_id && !latestNoteByStage[update.unit_stage_id]) {
      latestNoteByStage[update.unit_stage_id] = update.body
    }
  }

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
      {/* Back */}
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold">Unit {unit.unit_number}</h1>
            <UnitStatusBadge status={unit.status} />
          </div>
          <p className="text-muted-foreground mt-0.5">
            {unit.buildings?.name}
            {unit.buildings?.address && (
              <span className="text-xs ml-2 text-muted-foreground/70">{unit.buildings.address}</span>
            )}
          </p>
          {unit.floor_plan && (
            <p className="text-sm text-muted-foreground mt-1">{unit.floor_plan}</p>
          )}
        </div>
        {unit.target_completion_date && (
          <div className={cn(
            'flex items-center gap-1.5 text-sm shrink-0',
            isOverdue(unit.target_completion_date) ? 'text-red-600 font-medium' : 'text-muted-foreground'
          )}>
            <Calendar className="h-3.5 w-3.5" />
            Target: {formatDate(unit.target_completion_date)}
          </div>
        )}
      </div>

      {/* Progress */}
      <Card className="shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-semibold tabular-nums">{progress.percent}%</span>
          </div>
          <ProgressBar progress={progress} showLabel={false} size="md" />
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{progress.completed} of {progress.total} stages complete</span>
            {progress.activeStage && (
              <span>Active: <span className="font-medium text-foreground">{progress.activeStage.name}</span></span>
            )}
          </div>
        </CardContent>
      </Card>

      {unit.notes && (
        <p className="text-sm text-muted-foreground border-l-2 border-amber-300 pl-3">
          {unit.notes}
        </p>
      )}

      {/* Stages */}
      <div className="space-y-1.5">
        <h2 className="text-sm font-semibold mb-2">Stages</h2>
        {stages.map((stage) => (
          <StageRow
            key={`${stage.id}-${stage.updated_at}`}
            stage={stage}
            contractors={contractors}
            expanded={expandedStage === stage.id}
            onToggle={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
            onUpdate={(data) => handleStageUpdate(stage.id, data)}
            onAddNote={async (note) => {
              await addUnitUpdate(unit.id, note, stage.id)
              router.refresh()
            }}
            saving={savingStage === stage.id}
            latestNote={latestNoteByStage[stage.id]}
          />
        ))}
      </div>

      {/* Updates feed */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Updates
          {(unit.unit_updates?.length ?? 0) > 0 && (
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
              {unit.unit_updates.length}
            </span>
          )}
        </h2>

        <form onSubmit={handleComment} className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a general unit update..."
            className="min-h-[68px] resize-none text-sm"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={submitting || !comment.trim()}>
              {submitting ? 'Posting...' : 'Post Update'}
            </Button>
          </div>
        </form>

        {(unit.unit_updates?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No updates yet.</p>
        ) : (
          <div className="space-y-2">
            {(unit.unit_updates as any[]).map((update) => (
              <Card key={update.id} className="shadow-none">
                <CardContent className="p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-xs font-medium shrink-0">
                        {update.profiles?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="text-sm font-medium truncate">{update.profiles?.full_name ?? 'Unknown'}</span>
                      {update.unit_stages && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          · {update.unit_stages.stage_templates?.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(update.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground/85 whitespace-pre-wrap">{update.body}</p>
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
// Stage row
// ============================================================

interface StageRowProps {
  stage:       UnitStageWithTemplate
  contractors: Pick<Contractor, 'id' | 'company_name' | 'trade_type'>[]
  expanded:    boolean
  onToggle:    () => void
  onUpdate:    (data: UpdateStageInput) => void
  onAddNote:   (note: string) => Promise<void>
  saving:      boolean
  latestNote?: string
}

function StageRow({ stage, contractors, expanded, onToggle, onUpdate, onAddNote, saving, latestNote }: StageRowProps) {
  const [status,        setStatus]        = useState(stage.status)
  const [contractorId,  setContractorId]  = useState(stage.contractor_id ?? '')
  const [dueDate,       setDueDate]       = useState(stage.due_date ?? '')
  const [notes,         setNotes]         = useState(stage.notes ?? '')
  const [blocker,       setBlocker]       = useState(stage.blocker_reason ?? '')
  const [delivReq,      setDelivReq]      = useState(stage.delivery_required)
  const [delivStatus,   setDelivStatus]   = useState(stage.delivery_status ?? '')
  const [materials,     setMaterials]     = useState(stage.materials_list ?? '')
  const [delivNotes,    setDelivNotes]    = useState(stage.delivery_notes ?? '')
  const [delivDue,      setDelivDue]      = useState(stage.delivery_due_date ?? '')
  const [stageNote,     setStageNote]     = useState('')
  const [postingNote,   setPostingNote]   = useState(false)

  const isComplete = status === 'complete'
  const isBlocked  = status === 'blocked'

  function handleSave() {
    onUpdate({
      status:             status,
      contractor_id:      contractorId || null,
      due_date:           dueDate || null,
      notes:              notes || null,
      blocker_reason:     blocker || null,
      delivery_required:  delivReq,
      delivery_status:    (delivStatus as DeliveryStatus) || null,
      materials_list:     materials || null,
      delivery_notes:     delivNotes || null,
      delivery_due_date:  delivDue || null,
    })
  }

  async function handlePostNote(e: React.FormEvent) {
    e.preventDefault()
    if (!stageNote.trim()) return
    setPostingNote(true)
    await onAddNote(stageNote.trim())
    setStageNote('')
    setPostingNote(false)
  }

  const contractorName = contractors.find((c) => c.id === contractorId)?.company_name

  return (
    <Card className={cn('shadow-none overflow-hidden transition-opacity', isComplete && 'opacity-60')}>
      {/* Collapsed row — click to expand */}
      <button className="w-full text-left" onClick={onToggle} aria-expanded={expanded}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={cn('h-2 w-2 rounded-full shrink-0', stageDotColor(status))} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-sm font-medium', isComplete && 'line-through text-muted-foreground')}>
                {stage.stage_templates.name}
              </span>
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                stageStatusVariant(status)
              )}>
                {STAGE_STATUS_LABELS[status]}
              </span>
              {contractorName && (
                <span className="text-xs text-muted-foreground hidden sm:inline">{contractorName}</span>
              )}
              {delivReq && delivStatus && delivStatus !== 'not_needed' && (
                <DeliveryStatusBadge status={delivStatus as DeliveryStatus} />
              )}
            </div>
            {/* Latest note preview */}
            {!expanded && latestNote && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[400px]">
                {latestNote}
              </p>
            )}
          </div>

          {dueDate && !isComplete && (
            <span className={cn(
              'text-xs shrink-0 hidden sm:block',
              isOverdue(dueDate) ? 'text-red-600 font-medium' : 'text-muted-foreground'
            )}>
              {formatDate(dueDate)}
            </span>
          )}

          <div className="shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* Expanded edit panel */}
      {expanded && (
        <div className="border-t bg-muted/20 px-4 pb-4 pt-3 space-y-4">

          {/* Core fields row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StageStatus)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STAGE_STATUS_LABELS) as [StageStatus, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Contractor</Label>
              <Select value={contractorId} onValueChange={setContractorId}>
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

            <div className="space-y-1.5">
              <Label className="text-xs">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Blocker reason — only when blocked */}
          {isBlocked && (
            <div className="space-y-1.5">
              <Label className="text-xs text-red-600">Blocker Reason</Label>
              <Input
                value={blocker}
                onChange={(e) => setBlocker(e.target.value)}
                placeholder="What is blocking this stage?"
                className="h-8 text-xs border-red-200 focus-visible:ring-red-300"
              />
            </div>
          )}

          {/* Stage notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Stage Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes for this stage..."
              className="min-h-[54px] text-xs resize-none"
            />
          </div>

          {/* Delivery section */}
          <div className="rounded-md border bg-background p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Material Delivery Required</span>
              </div>
              <Switch checked={delivReq} onCheckedChange={setDelivReq} />
            </div>

            {delivReq && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery Status</Label>
                  <Select value={delivStatus} onValueChange={setDelivStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(DELIVERY_STATUS_LABELS) as [string, string][]).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery Due Date</Label>
                  <Input
                    type="date"
                    value={delivDue}
                    onChange={(e) => setDelivDue(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Materials / Items Needed</Label>
                  <Textarea
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="e.g. toilet, trim kit, supply lines..."
                    className="min-h-[46px] text-xs resize-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Delivery Notes</Label>
                  <Input
                    value={delivNotes}
                    onChange={(e) => setDelivNotes(e.target.value)}
                    placeholder="Special instructions..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {/* Inline stage note */}
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Add a note for this stage</Label>
            <form onSubmit={handlePostNote} className="flex gap-2">
              <Input
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
                placeholder={`Note for ${stage.stage_templates.name}...`}
                className="h-8 text-xs flex-1"
              />
              <Button type="submit" size="sm" className="h-8 shrink-0" disabled={postingNote || !stageNote.trim()}>
                {postingNote ? '...' : 'Add'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </Card>
  )
}
