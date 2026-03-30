'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Contractor } from '@/types/database'
import { createContractor, updateContractor, deleteContractor } from '@/actions/contractors'
import { TRADE_LABELS } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Phone, Mail } from 'lucide-react'

const TRADE_OPTIONS = Object.entries(TRADE_LABELS)

interface Props { contractors: Contractor[] }

type Mode = 'create' | 'edit'

export function ContractorsView({ contractors }: Props) {
  const router = useRouter()
  const [dialogMode, setDialogMode] = useState<Mode>('create')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing,    setEditing]    = useState<Contractor | null>(null)
  const [tradeField, setTradeField] = useState('')
  const [error,      setError]      = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [deleteId,   setDeleteId]   = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setTradeField('')
    setError(null)
    setDialogMode('create')
    setDialogOpen(true)
  }

  function openEdit(c: Contractor) {
    setEditing(c)
    setTradeField(c.trade_type)
    setError(null)
    setDialogMode('edit')
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    if (tradeField) formData.set('trade_type', tradeField)

    const result = dialogMode === 'create'
      ? await createContractor(formData)
      : await updateContractor(editing!.id, formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setDialogOpen(false)
      setLoading(false)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    await deleteContractor(id)
    setDeleteId(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Contractor
        </Button>
      </div>

      {contractors.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No contractors yet. Add your first contractor to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden shadow-none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Trade</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Phone</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contractors.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.company_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contact_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {TRADE_LABELS[c.trade_type] ?? c.trade_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-foreground">
                        <Phone className="h-3 w-3" />{c.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-foreground truncate max-w-[160px]">
                        <Mail className="h-3 w-3 shrink-0" />{c.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Add Contractor' : 'Edit Contractor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input name="company_name" defaultValue={editing?.company_name} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Name</Label>
                <Input name="contact_name" defaultValue={editing?.contact_name ?? ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Trade</Label>
                <Select value={tradeField} onValueChange={setTradeField} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRADE_OPTIONS.map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input name="phone" type="tel" defaultValue={editing?.phone ?? ''} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editing?.email ?? ''} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea name="notes" defaultValue={editing?.notes ?? ''} className="min-h-[60px] resize-none" />
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !tradeField}>
                {loading ? 'Saving...' : dialogMode === 'create' ? 'Add Contractor' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contractor?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the contractor. Existing stage assignments will be cleared.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
