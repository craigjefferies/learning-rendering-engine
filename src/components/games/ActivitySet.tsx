import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { ActivitySetSpec, ActivitySetAnswer } from '../../domain/schema'
import { MCQ } from './MCQ'
import { Ordering } from './Ordering'
import { PairMatch } from './PairMatch'
import { FillInTheBlanks } from './FillInTheBlanks'
import { OMIProgress } from '../OMIProgress'

interface ActivitySetProps {
  spec: ActivitySetSpec
  answer?: ActivitySetAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: ActivitySetAnswer) => void
  onSubmit: (answer: ActivitySetAnswer) => void
  onReset: () => void
}

export function ActivitySet({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: ActivitySetProps) {
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>(answer?.answers || {})
  const [showFeedback, setShowFeedback] = useState(false)

  const currentActivity = spec.activities[currentActivityIndex]
  const totalActivities = spec.activities.length
  const isLastActivity = currentActivityIndex === totalActivities - 1
  const isFirstActivity = currentActivityIndex === 0
  const allAnswered = spec.activities.every((a) => answers[a.id] !== undefined && answers[a.id] !== null)

  useEffect(() => {
    if (evaluation) {
      setShowFeedback(false)
      setTimeout(() => setShowFeedback(true), 50)
    }
  }, [evaluation])

  const handleActivityAnswer = (activityId: string, activityAnswer: unknown) => {
    const newAnswers = { ...answers, [activityId]: activityAnswer }
    setAnswers(newAnswers)
    onAnswerChange({ answers: newAnswers })
  }

  const handleNext = () => {
    if (!isLastActivity) {
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
    if (!allAnswered) return
    onSubmit({ answers })
  }

  const handleTryAgain = () => {
    setAnswers({})
    setCurrentActivityIndex(0)
    setShowFeedback(false)
    onReset()
  }

  // Render the current activity based on its type
  const renderCurrentActivity = () => {
    const activity = currentActivity
    const activityAnswer = answers[activity.id]

    switch (activity.type) {
      case 'mcq':
        return (
          <MCQ
            spec={activity}
            answer={activityAnswer as any}
            disabled={disabled || Boolean(evaluation)}
            onAnswerChange={(mcqAnswer) => handleActivityAnswer(activity.id, mcqAnswer)}
            onSubmit={() => {}} // Don't submit individual activities
            onReset={() => {}}
          />
        )
      case 'ordering':
        return (
          <Ordering
            spec={activity}
            answer={activityAnswer as any}
            disabled={disabled || Boolean(evaluation)}
            onAnswerChange={(orderingAnswer) => handleActivityAnswer(activity.id, orderingAnswer)}
            onSubmit={() => {}} // Don't submit individual activities
            onReset={() => {}}
          />
        )
      case 'pair-match':
        return (
          <PairMatch
            spec={activity}
            answer={activityAnswer as any}
            disabled={disabled || Boolean(evaluation)}
            onAnswerChange={(pairMatchAnswer) => handleActivityAnswer(activity.id, pairMatchAnswer)}
            onSubmit={() => {}} // Don't submit individual activities
            onReset={() => {}}
          />
        )
      case 'fill-in-the-blanks':
        return (
          <FillInTheBlanks
            spec={activity}
            answer={activityAnswer as any}
            disabled={disabled || Boolean(evaluation)}
            onAnswerChange={(fillAnswer) => handleActivityAnswer(activity.id, fillAnswer)}
            onSubmit={() => {}} // Don't submit individual activities
            onReset={() => {}}
          />
        )
      default:
        return <p className="text-red-600">Unknown activity type</p>
    }
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
          </div>
          {currentActivity.omiMapping && currentActivity.omiMapping.length > 0 && (
            <OMIProgress spec={spec} currentOmiIds={currentActivity.omiMapping} />
          )}
        </div>

        {renderCurrentActivity()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isFirstActivity}
          className="rounded-lg bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          ← Previous
        </button>

        {!isLastActivity ? (
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
            {allAnswered ? '✓ Submit All Activities' : `Complete ${totalActivities - Object.keys(answers).length} more`}
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
