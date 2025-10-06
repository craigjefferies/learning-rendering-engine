import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { OrderingSetSpec, OrderingSetAnswer } from '../../domain/schema'
import { OMIProgress } from '../OMIProgress'

interface OrderingSetProps {
  spec: OrderingSetSpec
  answer?: OrderingSetAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: OrderingSetAnswer) => void
  onSubmit: (answer: OrderingSetAnswer) => void
  onReset: () => void
}

export function OrderingSet({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: OrderingSetProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>(answer?.answers || {})
  const [showFeedback, setShowFeedback] = useState(false)

  // For the current question's ordering state
  const [currentOrder, setCurrentOrder] = useState<string[]>([])
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)

  const currentQuestion = spec.questions[currentQuestionIndex]
  const totalQuestions = spec.questions.length
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1
  const isFirstQuestion = currentQuestionIndex === 0
  const allAnswered = spec.questions.every((q) => {
    const questionOrder = answers[q.id]
    return questionOrder && questionOrder.length === q.items.length
  })

  // Initialize order from saved answer or shuffle items when question changes
  useEffect(() => {
    const savedOrder = answers[currentQuestion.id]
    if (savedOrder) {
      setCurrentOrder(savedOrder)
    } else {
      // Shuffle items if specified
      const items = [...currentQuestion.items]
      if (currentQuestion.shuffle) {
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[items[i], items[j]] = [items[j], items[i]]
        }
      }
      setCurrentOrder(items)
    }
  }, [currentQuestionIndex, currentQuestion.id, currentQuestion.items, currentQuestion.shuffle, answers])

  useEffect(() => {
    if (evaluation) {
      setShowFeedback(false)
      setTimeout(() => setShowFeedback(true), 50)
    }
  }, [evaluation])

  const saveCurrentQuestionOrder = (newOrder: string[]) => {
    const newAnswers = { ...answers, [currentQuestion.id]: newOrder }
    setAnswers(newAnswers)
    onAnswerChange({ answers: newAnswers })
  }

  const handleDragStart = (item: string) => {
    if (disabled || evaluation) return
    setDraggedItem(item)
  }

  const handleDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault()
    if (disabled || evaluation) return
    setDraggedOverIndex(index)
  }

  const handleDragLeave = () => {
    setDraggedOverIndex(null)
  }

  const handleDrop = (event: React.DragEvent, dropIndex: number) => {
    event.preventDefault()
    if (disabled || evaluation || !draggedItem) return

    const dragIndex = currentOrder.indexOf(draggedItem)
    if (dragIndex === -1) return

    const newOrder = [...currentOrder]
    newOrder.splice(dragIndex, 1)
    newOrder.splice(dropIndex, 0, draggedItem)

    setCurrentOrder(newOrder)
    saveCurrentQuestionOrder(newOrder)
    setDraggedItem(null)
    setDraggedOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDraggedOverIndex(null)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0 || disabled || evaluation) return
    const newOrder = [...currentOrder]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setCurrentOrder(newOrder)
    saveCurrentQuestionOrder(newOrder)
  }

  const handleMoveDown = (index: number) => {
    if (index === currentOrder.length - 1 || disabled || evaluation) return
    const newOrder = [...currentOrder]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setCurrentOrder(newOrder)
    saveCurrentQuestionOrder(newOrder)
  }

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!allAnswered) return
    onSubmit({ answers })
  }

  const handleTryAgain = () => {
    setAnswers({})
    setCurrentQuestionIndex(0)
    setShowFeedback(false)
    onReset()
  }

  // Check if an item is in the correct position
  const isItemCorrect = (index: number): boolean => {
    return currentOrder[index] === currentQuestion.items[index]
  }

  // Get all correct positions count for progress
  const getCorrectPositionsCount = (): number => {
    let count = 0
    for (let i = 0; i < currentOrder.length; i++) {
      if (currentOrder[i] === currentQuestion.items[i]) {
        count++
      }
    }
    return count
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Simple Progress Bar */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ 
            width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` 
          }}
        />
      </div>

      {/* Current Question */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {currentQuestion.title && (
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {currentQuestion.title}
              </h3>
            )}

            {currentQuestion.prompt && (
              <p className="text-base text-slate-600 dark:text-slate-300">
                {currentQuestion.prompt}
              </p>
            )}
          </div>
          {currentQuestion.omiMapping && currentQuestion.omiMapping.length > 0 && (
            <OMIProgress spec={spec} currentOmiIds={currentQuestion.omiMapping} />
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            💡 Drag items to reorder them, or use the arrow buttons. Items in the correct position will show green.
          </p>
          <p className="mt-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
            {getCorrectPositionsCount()} of {currentOrder.length} items in correct position
          </p>
        </div>

        {/* Ordering Interface */}
        <div className="space-y-3">
          {currentOrder.map((item, index) => {
            const isCorrect = isItemCorrect(index)
            return (
              <div
                key={item}
                draggable={!disabled && !evaluation}
                onDragStart={() => handleDragStart(item)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`group flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  isCorrect
                    ? 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-950/30'
                    : 'bg-white dark:bg-slate-800'
                } ${
                  draggedItem === item
                    ? 'border-indigo-500 opacity-50 dark:border-indigo-400'
                    : draggedOverIndex === index
                      ? 'border-purple-500 bg-purple-50 shadow-lg dark:border-purple-400 dark:bg-purple-950/30'
                      : isCorrect
                        ? ''
                        : 'border-slate-300 hover:border-indigo-400 dark:border-slate-600 dark:hover:border-indigo-500'
                } ${disabled || evaluation ? 'cursor-not-allowed' : 'cursor-move'}`}
              >
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  isCorrect
                    ? 'bg-green-500 text-white dark:bg-green-600'
                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                }`}>
                  {isCorrect ? '✓' : index + 1}
                </div>
                <span className={`flex-1 font-medium ${
                  isCorrect
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-slate-800 dark:text-slate-200'
                }`}>
                  {item}
                </span>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || disabled || Boolean(evaluation)}
                    className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    title="Move up"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === currentOrder.length - 1 || disabled || Boolean(evaluation)}
                    className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    title="Move down"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isFirstQuestion}
          className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          ← Previous
        </button>

        {!isLastQuestion ? (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Next →
          </button>
        ) : (
          <button
            type="submit"
            disabled={!allAnswered || disabled || Boolean(evaluation)}
            className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:from-green-700 hover:to-green-800 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500"
          >
            {allAnswered ? '✓ Submit All Answers' : `Answer ${totalQuestions - Object.keys(answers).filter((qId) => {
              const q = spec.questions.find((sq) => sq.id === qId)
              return q && answers[qId].length === q.items.length
            }).length} more`}
          </button>
        )}
      </div>

      {/* Feedback */}
      {evaluation && showFeedback && (
        <div
          className={`rounded-2xl border-2 p-6 shadow-xl transition-all animate-slide-in ${
            evaluation.correct
              ? 'border-green-300 bg-gradient-to-br from-green-50 to-green-100 dark:border-green-500/40 dark:from-green-950/50 dark:to-green-900/30'
              : 'border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 dark:border-amber-500/40 dark:from-amber-950/50 dark:to-amber-900/30'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl ${
                evaluation.correct
                  ? 'bg-green-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {evaluation.correct ? '✓' : '○'}
            </div>
            <div className="flex-1 space-y-3">
              <p
                className={`text-lg font-bold ${
                  evaluation.correct
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-amber-800 dark:text-amber-200'
                }`}
              >
                {evaluation.feedback}
              </p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Score: {Math.round(evaluation.score * 100)}%
              </p>
              {!evaluation.correct && (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="mt-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 font-semibold text-white shadow-lg transition-all hover:from-indigo-700 hover:to-purple-700"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
