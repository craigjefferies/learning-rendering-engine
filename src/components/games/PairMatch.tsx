import { useEffect, useMemo, useState } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { PairMatchAnswer, PairMatchSpec } from '../../domain/schema'

interface PairMatchProps {
  spec: PairMatchSpec
  answer?: PairMatchAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: PairMatchAnswer) => void
  onSubmit: (answer: PairMatchAnswer) => void
  onReset: () => void
}

export function PairMatch({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: PairMatchProps) {
  const rightOptions = useMemo(
    () => [...spec.pairs.map((pair) => pair.right), ...(spec.distractorsRight ?? [])],
    [spec.distractorsRight, spec.pairs],
  )

  const initialMatches = useMemo<PairMatchAnswer>(() => {
    if (answer?.matches?.length) {
      return answer
    }
    return {
      matches: spec.pairs.map((pair) => ({ left: pair.left, right: '' })),
    }
  }, [answer, spec.pairs])

  const [matches, setMatches] = useState<PairMatchAnswer>(initialMatches)

  useEffect(() => {
    setMatches(initialMatches)
  }, [initialMatches])

  useEffect(() => {
    onAnswerChange(matches)
  }, [matches, onAnswerChange])

  const handleSelect = (index: number, right: string) => {
    setMatches((prev) => {
      const next = prev.matches.map((match, i) =>
        i === index
          ? {
              left: match.left,
              right,
            }
          : match,
      )
      return { matches: next }
    })
  }

  const handleSubmit = () => {
    onSubmit(matches)
  }

  const handleTryAgain = () => {
    setMatches({ matches: spec.pairs.map((pair) => ({ left: pair.left, right: '' })) })
    onReset()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {spec.prompt && <p className="text-lg font-medium">{spec.prompt}</p>}
        {spec.instructions && <p className="text-sm text-slate-500 dark:text-slate-300">{spec.instructions}</p>}
      </div>

      <div className="space-y-3" role="group" aria-label="Match the terms to their definitions">
        {matches.matches.map((match, index) => (
          <div
            key={`${match.left}-${index}`}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-base font-medium">{match.left}</span>
            <select
              value={match.right}
              onChange={(event) => handleSelect(index, event.target.value)}
              disabled={disabled}
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-base focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900"
            >
              <option value="" disabled>
                Select definition
              </option>
              {rightOptions.map((option) => (
                <option key={`${match.left}-${option}`} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={disabled}
        >
          Submit
        </button>
        {evaluation && (
          <button
            type="button"
            onClick={handleTryAgain}
            className="rounded-md border border-indigo-600 px-4 py-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-slate-800"
          >
            Try again
          </button>
        )}
      </div>

      <div className="aria-live" aria-live="polite" aria-atomic="true">
        {evaluation && (
          <p className={evaluation.correct ? 'text-sm font-medium text-emerald-600' : 'text-sm font-medium text-red-600'}>
            {evaluation.feedback}
          </p>
        )}
      </div>
    </div>
  )
}
