import { createClient } from '@/lib/supabase/server'
import { ContractorsView } from '@/components/contractors/ContractorsView'
import { Users } from 'lucide-react'

export default async function ContractorsPage() {
  const supabase = await createClient()
  const { data: contractors } = await supabase
    .from('contractors')
    .select('*')
    .order('company_name')

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Contractors</h1>
        <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {(contractors ?? []).length}
        </span>
      </div>
      <ContractorsView contractors={contractors ?? []} />
    </div>
  )
}
