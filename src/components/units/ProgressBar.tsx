import { cn } from '@/lib/utils'
import type { UnitProgress } from '@/types/database'

interface ProgressBarProps {
  progress: UnitProgress
  showLabel?: boolean
  size?: 'sm' | 'md'
}

export function ProgressBar({ progress, showLabel = true, size = 'sm' }: ProgressBarProps) {
  const { percent, completed, total, isBlocked } = progress
  const barColor = isBlocked
    ? 'bg-red-500'
    : percent === 100
    ? 'bg-emerald-500'
    : 'bg-blue-500'

  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex-1 overflow-hidden rounded-full bg-secondary', size === 'sm' ? 'h-1.5' : 'h-2')}>
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
          {completed}/{total}
        </span>
      )}
    </div>
  )
}
