'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBuilding, updateBuilding, deleteBuilding } from '@/actions/buildings'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Building2, MapPin, ChevronRight } from 'lucide-react'

interface BuildingRow {
  id:         string
  name:       string
  address:    string | null
  unit_count: number
  created_at: string
}

interface Props { buildings: BuildingRow[] }

type Mode = 'create' | 'edit'

export function BuildingsView({ buildings }: Props) {
  const router = useRouter()
  const [mode,      setMode]      = useState<Mode>('create')
  const [open,      setOpen]      = useState(false)
  const [editing,   setEditing]   = useState<BuildingRow | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [deleteId,  setDeleteId]  = useState<string | null>(null)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setError(null)
    setMode('create')
    setOpen(true)
  }

  function openEdit(b: BuildingRow) {
    setEditing(b)
    setError(null)
    setMode('edit')
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)

    const result = mode === 'create'
      ? await createBuilding(formData)
      : await updateBuilding(editing!.id, formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      setLoading(false)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    setDeleteErr(null)
    const result = await deleteBuilding(id)
    if (result?.error) {
      setDeleteErr(result.error)
    } else {
      setDeleteId(null)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Building
        </Button>
      </div>

      {buildings.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="p-10 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No buildings yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first building to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map((b) => (
            <Card key={b.id} className="shadow-none hover:shadow-sm transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/buildings/${b.id}`}
                      className="font-medium text-sm hover:text-primary transition-colors block truncate"
                    >
                      {b.name}
                    </Link>
                    {b.address && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{b.address}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1">
                      <span className="text-xs font-medium tabular-nums">{b.unit_count}</span>
                      <span className="text-xs text-muted-foreground">
                        {b.unit_count === 1 ? 'unit' : 'units'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(b)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => { setDeleteErr(null); setDeleteId(b.id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Add Building' : 'Edit Building'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Building Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ''}
                placeholder="e.g. Elmwood Park Apartments"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={editing?.address ?? ''}
                placeholder="e.g. 1750 Elmwood Ave, Chicago, IL"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : mode === 'create' ? 'Add Building' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) { setDeleteId(null); setDeleteErr(null) } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Building?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the building. Units assigned to it must be removed first.
          </p>
          {deleteErr && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{deleteErr}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteErr(null) }}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
