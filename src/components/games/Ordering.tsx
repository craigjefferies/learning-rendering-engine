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
  const [showFeedback, setShowFeedback] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    setOrder(initialOrder)
  }, [initialOrder])

  useEffect(() => {
    if (evaluation) {
      setShowFeedback(false)
      setTimeout(() => setShowFeedback(true), 50)
    }
  }, [evaluation])

  const moveItem = (index: number, direction: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= prev.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      onAnswerChange({ order: next })
      return next
    })
  }

  const handleDragStart = (index: number) => {
    if (disabled) return
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (disabled || draggedIndex === null) return
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (disabled || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    setOrder((prev) => {
      const next = [...prev]
      const [removed] = next.splice(draggedIndex, 1)
      next.splice(dropIndex, 0, removed)
      onAnswerChange({ order: next })
      return next
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleSubmit = () => {
    onSubmit({ order })
  }

  const handleTryAgain = () => {
    setOrder(spec.shuffle ? shuffle(spec.items) : [...spec.items])
    setShowFeedback(false)
    onReset()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-3">
        {spec.prompt && (
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{spec.prompt}</p>
        )}
        {spec.instructions && (
          <p className="text-sm text-slate-600 dark:text-slate-400">{spec.instructions}</p>
        )}
        {!disabled && !evaluation && (
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Drag items to reorder or use the arrow buttons
          </p>
        )}
      </div>

      <ol className="space-y-3" aria-label="Reorder the items">
        {order.map((item, index) => {
          const isDragging = draggedIndex === index
          const isDraggedOver = dragOverIndex === index
          
          return (
            <li
              key={`${item}-${index}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`
                group flex items-center gap-4 rounded-xl border-2 bg-white p-4 shadow-sm transition-all duration-200
                animate-slide-in
                ${
                  isDragging
                    ? 'opacity-40 scale-95 cursor-grabbing'
                    : isDraggedOver
                    ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-950/50 scale-105 shadow-lg'
                    : evaluation && evaluation.correct
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : evaluation && !evaluation.correct
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                    : 'border-slate-200 dark:border-slate-700 dark:bg-slate-800 hover:border-indigo-300 hover:shadow-md'
                }
                ${!disabled && !evaluation ? 'cursor-grab active:cursor-grabbing' : ''}
              `}
            >
              {!disabled && !evaluation && (
                <div className="flex-shrink-0 text-slate-400 dark:text-slate-500 cursor-grab">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
                  </svg>
                </div>
              )}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 font-bold text-white shadow-sm">
                {index + 1}
              </div>
              <span className="flex-1 text-base font-medium text-slate-700 dark:text-slate-200">{item}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={disabled || index === 0}
                  className="group/btn flex h-9 w-9 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  aria-label={`Move ${item} up`}
                  title="Move up"
                >
                  <svg className="h-5 w-5 transition-transform group-hover/btn:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={disabled || index === order.length - 1}
                  className="group/btn flex h-9 w-9 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 hover:scale-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  aria-label={`Move ${item} down`}
                  title="Move down"
                >
                  <svg className="h-5 w-5 transition-transform group-hover/btn:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          disabled={disabled}
        >
          <span className="relative z-10 flex items-center gap-2">
            Submit Order
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </button>
        {evaluation && (
          <button
            type="button"
            onClick={handleTryAgain}
            className="rounded-lg border-2 border-indigo-600 bg-transparent px-6 py-3 font-semibold text-indigo-600 transition-all duration-200 hover:bg-indigo-50 hover:scale-105 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
          >
            Try Again
          </button>
        )}
      </div>

      {evaluation && showFeedback && (
        <div className={`rounded-xl p-4 animate-slide-in ${
          evaluation.correct 
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/30' 
            : 'bg-gradient-to-r from-red-500 to-red-400 text-white shadow-lg shadow-red-500/30'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {evaluation.correct ? (
                <svg className="h-6 w-6 animate-bounce-slow" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">
                {evaluation.correct ? '🎉 Perfect Order!' : '❌ Not Quite'}
              </p>
              {evaluation.feedback && (
                <p className="mt-1 text-sm opacity-95">{evaluation.feedback}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
