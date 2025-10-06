import { useMemo } from 'react'
import { useRendererStore } from '../lib/store'
import type { OMIMasteryLevel } from '../domain/events'
import type { GameSpec } from '../domain/schema'

interface OMIProgressProps {
  spec: GameSpec
  currentOmiIds?: string[] // Optional: specific OMIs for current question/activity
}

const masteryConfig: Record<OMIMasteryLevel, { label: string; color: string; bgColor: string; icon: string }> = {
  'not-yet': {
    label: 'Not Yet',
    color: 'text-slate-500',
    bgColor: 'bg-slate-200',
    icon: '○',
  },
  'emerging': {
    label: 'Emerging',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    icon: '◔',
  },
  'proficient': {
    label: 'Proficient',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500',
    icon: '◑',
  },
  'mastered': {
    label: 'Mastered',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
    icon: '●',
  },
}

export function OMIProgress({ spec, currentOmiIds }: OMIProgressProps) {
  const omiProgress = useRendererStore((state) => state.omiProgress)
  
  const omis = currentOmiIds || spec.metadata?.omis || []
  const assessmentStandard = spec.metadata?.assessmentStandard

  const omiDetails = useMemo(() => {
    return omis.map((omiId) => {
      const progress = omiProgress[omiId]
      const mastery = progress?.masteryLevel || 'not-yet'
      const config = masteryConfig[mastery]
      
      return {
        omiId,
        mastery,
        config,
        progress,
      }
    })
  }, [omis, omiProgress])

  if (omis.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {assessmentStandard && (
        <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {assessmentStandard}
        </span>
      )}
      {omiDetails.map(({ omiId, config, progress }) => {
        const percentage = progress ? Math.round(progress.averageAccuracy * 100) : 0
        const successRate = progress ? `${progress.successfulAttempts}/${progress.totalAttempts}` : '0/0'
        
        return (
          <div
            key={omiId}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-800"
            title={`${omiId.replace(/_/g, ' ')}: ${config.label} - ${successRate} (${percentage}%)`}
          >
            <span className={`text-sm ${config.color}`}>
              {config.icon}
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {successRate}
            </span>
            <span className={`font-bold ${config.color}`}>
              {percentage}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
