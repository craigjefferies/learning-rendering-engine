import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { ClassificationSetSpec, ClassificationSetAnswer } from '../../domain/schema'
import { OMIProgress } from '../OMIProgress'
import { useRendererStore } from '../../lib/store'

interface ClassificationSetProps {
  spec: ClassificationSetSpec
  answer?: ClassificationSetAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: ClassificationSetAnswer) => void
  onSubmit: (answer: ClassificationSetAnswer) => void
  onReset: () => void
}

export function ClassificationSet({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: ClassificationSetProps) {
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>(answer?.answers || {})
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const markQuestionSubmitted = useRendererStore((state) => state.markQuestionSubmitted)

  const currentActivity = spec.activities[currentActivityIndex]
  const totalActivities = spec.activities.length
  const isLastActivity = currentActivityIndex === totalActivities - 1
  const isFirstActivity = currentActivityIndex === 0
  
  // Check if all items in current activity are classified
  const currentActivityAnswers = answers[currentActivity.id] || {}
  
  // Check if all activities are complete
  const allActivitiesComplete = spec.activities.every((activity) => {
    const activityAnswers = answers[activity.id] || {}
    return activity.items.every((item) => activityAnswers[item.id])
  })

  useEffect(() => {
    if (evaluation) {
      setShowFeedback(false)
      setTimeout(() => setShowFeedback(true), 50)
    }
  }, [evaluation])

  const handleDragStart = (itemId: string) => {
    if (disabled || evaluation) return
    setDraggedItem(itemId)
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent, categoryId: string) => {
    event.preventDefault()
    if (disabled || evaluation || !draggedItem) return

    const newActivityAnswers = { ...currentActivityAnswers, [draggedItem]: categoryId }
    const newAnswers = { ...answers, [currentActivity.id]: newActivityAnswers }
    setAnswers(newAnswers)
    onAnswerChange({ answers: newAnswers })
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  const handleRemoveItem = (itemId: string) => {
    if (disabled || evaluation) return
    const newActivityAnswers = { ...currentActivityAnswers }
    delete newActivityAnswers[itemId]
    const newAnswers = { ...answers, [currentActivity.id]: newActivityAnswers }
    setAnswers(newAnswers)
    onAnswerChange({ answers: newAnswers })
  }

  const handleNext = () => {
    if (!isLastActivity) {
      // Check if current activity is correct and mark it
      const activityAnswers = answers[currentActivity.id] || {}
      const allItemsClassified = currentActivity.items.every(item => activityAnswers[item.id])
      
      if (allItemsClassified) {
        const allCorrect = currentActivity.items.every(item => {
          const assignedCategory = activityAnswers[item.id]
          return assignedCategory === item.correctCategoryId
        })
        markQuestionSubmitted(spec.id, currentActivity.id, allCorrect)
      }
      
      setCurrentActivityIndex(currentActivityIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstActivity) {
      setCurrentActivityIndex(currentActivityIndex - 1)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!allActivitiesComplete) return
    
    // Mark the last activity as submitted
    const activityAnswers = answers[currentActivity.id] || {}
    const allCorrect = currentActivity.items.every(item => {
      const assignedCategory = activityAnswers[item.id]
      return assignedCategory === item.correctCategoryId
    })
    markQuestionSubmitted(spec.id, currentActivity.id, allCorrect)
    
    onSubmit({ answers })
  }

  const handleTryAgain = () => {
    setAnswers({})
    setCurrentActivityIndex(0)
    setShowFeedback(false)
    onReset()
  }

  // Check if an item is classified correctly (real-time feedback)
  const isItemCorrect = (itemId: string): boolean | null => {
    const assignedCategoryId = currentActivityAnswers[itemId]
    if (!assignedCategoryId) return null
    
    const item = currentActivity.items.find((i) => i.id === itemId)
    return item?.correctCategoryId === assignedCategoryId
  }

  // Get items assigned to a category
  const getItemsInCategory = (categoryId: string) => {
    return Object.entries(currentActivityAnswers)
      .filter(([_, catId]) => catId === categoryId)
      .map(([itemId]) => itemId)
  }

  // Get unclassified items
  const getUnclassifiedItems = () => {
    return currentActivity.items.filter((item) => !currentActivityAnswers[item.id])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Simple Progress Bar */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ 
            width: `${((currentActivityIndex + 1) / totalActivities) * 100}%` 
          }}
        />
      </div>

      {/* Current Activity */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {currentActivity.title && (
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {currentActivity.title}
              </h3>
            )}
            {currentActivity.prompt && (
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                {currentActivity.prompt}
              </p>
            )}
          </div>
          {currentActivity.omiMapping && currentActivity.omiMapping.length > 0 && (
            <OMIProgress spec={spec} currentOmiIds={currentActivity.omiMapping} />
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 Drag each item into the category box where it belongs. Items will show green for correct or red for incorrect.
          </p>
        </div>

        {/* Unclassified Items */}
        {getUnclassifiedItems().length > 0 && (
          <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Items to Classify
            </h4>
            <div className="flex flex-wrap gap-2">
              {getUnclassifiedItems().map((item) => (
                <div
                  key={item.id}
                  draggable={!disabled && !evaluation}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-lg border-2 border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition-all dark:border-indigo-600 dark:bg-slate-800 dark:text-slate-200 ${
                    disabled || evaluation ? 'cursor-not-allowed opacity-60' : 'cursor-move hover:border-indigo-500 hover:shadow-md'
                  } ${draggedItem === item.id ? 'opacity-50' : ''}`}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Boxes */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {currentActivity.categories.map((category) => {
            const itemsInCategory = getItemsInCategory(category.id)
            return (
              <div
                key={category.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, category.id)}
                className="min-h-[200px] rounded-lg border-2 border-dashed border-slate-300 bg-white p-4 transition-all dark:border-slate-700 dark:bg-slate-800"
              >
                <h4 className="mb-3 text-base font-bold text-slate-700 dark:text-slate-300">
                  {category.name}
                </h4>
                <div className="space-y-2">
                  {itemsInCategory.map((itemId) => {
                    const item = currentActivity.items.find((i) => i.id === itemId)!
                    const isCorrect = isItemCorrect(itemId)
                    return (
                      <div
                        key={itemId}
                        className={`flex items-start gap-2 rounded-lg border-2 p-3 transition-all ${
                          isCorrect === true
                            ? 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-950/30'
                            : isCorrect === false
                              ? 'border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/30'
                              : 'border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/50'
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 text-lg ${
                            isCorrect === true
                              ? 'text-green-600 dark:text-green-400'
                              : isCorrect === false
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-400'
                          }`}
                        >
                          {isCorrect === true ? '✓' : isCorrect === false ? '✗' : '•'}
                        </span>
                        <span
                          className={`flex-1 text-sm font-medium ${
                            isCorrect === true
                              ? 'text-green-800 dark:text-green-200'
                              : isCorrect === false
                                ? 'text-red-800 dark:text-red-200'
                                : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.text}
                        </span>
                        {!evaluation && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(itemId)}
                            className="flex-shrink-0 rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                            title="Remove from category"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {itemsInCategory.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                      Drop items here
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isFirstActivity}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          ← Previous
        </button>

        {!isLastActivity ? (
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Next →
          </button>
        ) : (
          <button
            type="submit"
            disabled={!allActivitiesComplete || disabled || Boolean(evaluation)}
            className="rounded-lg bg-green-600 px-6 py-2.5 font-bold text-white shadow-lg transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {allActivitiesComplete ? '✓ Submit All Classifications' : `Classify ${currentActivity.items.length - Object.values(currentActivityAnswers).length} more`}
          </button>
        )}
      </div>

      {/* Feedback */}
      {evaluation && showFeedback && (
        <div
          className={`rounded-lg border p-6 ${
            evaluation.correct
              ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/50'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl ${
                evaluation.correct ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
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
                  className="mt-4 rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white shadow-lg transition hover:bg-indigo-700"
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
