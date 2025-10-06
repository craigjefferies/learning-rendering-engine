import { useEffect, useMemo, useState } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { OrderingAnswer, OrderingSpec } from '../../domain/schema'

interface OrderingProps {
  spec: OrderingSpec
  answer?: OrderingAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: OrderingAnswer) => void
  onSubmit: (answer: OrderingAnswer) => void
  onReset: () => void
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function Ordering({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: OrderingProps) {
  const initialOrder = useMemo(() => {
    if (answer?.order?.length) {
      return answer.order
    }
    if (spec.shuffle) {
      return shuffle(spec.items)
    }
    return [...spec.items]
  }, [answer?.order, spec.items, spec.shuffle])

  const [order, setOrder] = useState<string[]>(initialOrder)

  useEffect(() => {
    setOrder(initialOrder)
  }, [initialOrder])

  useEffect(() => {
    onAnswerChange({ order })
  }, [order, onAnswerChange])

  const moveItem = (index: number, direction: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= prev.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  const handleSubmit = () => {
    onSubmit({ order })
  }

  const handleTryAgain = () => {
    setOrder(spec.shuffle ? shuffle(spec.items) : [...spec.items])
    onReset()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {spec.prompt && <p className="text-lg font-medium">{spec.prompt}</p>}
        {spec.instructions && <p className="text-sm text-slate-500 dark:text-slate-300">{spec.instructions}</p>}
      </div>

      <ol className="space-y-2" aria-label="Reorder the items">
        {order.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="text-base font-medium">{item}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => moveItem(index, -1)}
                disabled={disabled || index === 0}
                className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200"
                aria-label={`Move ${item} up`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 1)}
                disabled={disabled || index === order.length - 1}
                className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200"
                aria-label={`Move ${item} down`}
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ol>

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
