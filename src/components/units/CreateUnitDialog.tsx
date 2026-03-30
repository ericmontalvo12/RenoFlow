'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createUnit } from '@/actions/units'
import type { Building } from '@/types/database'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  open:         boolean
  onOpenChange: (open: boolean) => void
  buildings:    Pick<Building, 'id' | 'name'>[]
}

export function CreateUnitDialog({ open, onOpenChange, buildings }: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const [error,      setError]      = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [buildingId, setBuildingId] = useState('')

  function handleClose() {
    onOpenChange(false)
    setBuildingId('')
    setError(null)
    formRef.current?.reset()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!buildingId) {
      setError('Please select a building.')
      return
    }

    const form = e.currentTarget
    const unitNumber  = (form.elements.namedItem('unit_number')  as HTMLInputElement).value.trim()
    const floorPlan   = (form.elements.namedItem('floor_plan')   as HTMLInputElement).value.trim()
    const targetDate  = (form.elements.namedItem('target_completion_date') as HTMLInputElement).value
    const notes       = (form.elements.namedItem('notes') as HTMLInputElement | null)?.value.trim()

    if (!unitNumber) {
      setError('Unit number is required.')
      return
    }

    setLoading(true)
    setError(null)

    const result = await createUnit({
      building_id:            buildingId,
      unit_number:            unitNumber,
      floor_plan:             floorPlan   || undefined,
      target_completion_date: targetDate  || undefined,
      notes:                  notes       || undefined,
    })

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      handleClose()
      setLoading(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Unit</DialogTitle>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Building</Label>
            <Select value={buildingId} onValueChange={(v) => { setBuildingId(v); setError(null) }}>
              <SelectTrigger>
                <SelectValue placeholder="Select building..." />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit_number">Unit Number</Label>
            <Input id="unit_number" name="unit_number" placeholder="e.g. 204" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="floor_plan">Floor Plan</Label>
            <Input id="floor_plan" name="floor_plan" placeholder="e.g. 2BR/1BA" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="target_completion_date">Target Completion</Label>
            <Input id="target_completion_date" name="target_completion_date" type="date" />
          </div>
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
