import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { MCQAnswer, MCQSpec } from '../../domain/schema'

interface MCQProps {
  spec: MCQSpec
  answer?: MCQAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: MCQAnswer) => void
  onSubmit: (answer: MCQAnswer) => void
  onReset: () => void
}

export function MCQ({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: MCQProps) {
  const [selected, setSelected] = useState(answer?.optionId ?? '')
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    if (answer?.optionId) {
      setSelected(answer.optionId)
    }
  }, [answer?.optionId])

  useEffect(() => {
    if (evaluation) {
      setShowFeedback(false)
      setTimeout(() => setShowFeedback(true), 50)
    }
  }, [evaluation])

  const handleChange = (optionId: string) => {
    setSelected(optionId)
    onAnswerChange({ optionId })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    onSubmit({ optionId: selected })
  }

  const handleTryAgain = () => {
    setSelected('')
    setShowFeedback(false)
    onReset()
  }

  const isCorrectOption = (optionId: string) => {
    return evaluation && spec.correctOptionId === optionId
  }

  const isSelectedWrong = (optionId: string) => {
    return evaluation && !evaluation.correct && selected === optionId
  }

  return (
    <form className="space-y-6 animate-fade-in" onSubmit={handleSubmit}>
      <div className="space-y-3">
        {spec.prompt && (
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{spec.prompt}</p>
        )}
        {spec.instructions && (
          <p className="text-sm text-slate-600 dark:text-slate-400">{spec.instructions}</p>
        )}
      </div>

      <fieldset className="space-y-3" disabled={disabled}>
        <legend className="sr-only">Multiple choice options</legend>
        {spec.options.map((option, index) => {
          const isSelected = selected === option.id
          const isCorrect = isCorrectOption(option.id)
          const isWrong = isSelectedWrong(option.id)
          
          return (
            <label
              key={option.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`
                group flex items-start gap-4 rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer
                animate-slide-in
                ${
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg shadow-emerald-500/20'
                    : isWrong
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30 animate-shake'
                    : isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 hover:border-indigo-300 hover:shadow-md hover:scale-[1.01]'
                }
                ${disabled ? 'cursor-not-allowed opacity-75' : ''}
              `}
            >
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="radio"
                  name={`mcq-${spec.id}`}
                  value={option.id}
                  checked={isSelected}
                  onChange={() => handleChange(option.id)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-slate-300 bg-white transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-700"
                  disabled={disabled}
                />
                {isSelected && !evaluation && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-2.5 w-2.5 rounded-full bg-white animate-scale-in"></div>
                  </div>
                )}
                {isCorrect && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg className="h-5 w-5 text-white animate-scale-in" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {isWrong && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg className="h-5 w-5 text-white animate-scale-in" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <span className={`flex-1 text-base font-medium transition-colors ${
                isCorrect ? 'text-emerald-700 dark:text-emerald-300' :
                isWrong ? 'text-red-700 dark:text-red-300' :
                isSelected ? 'text-indigo-700 dark:text-indigo-300' :
                'text-slate-700 dark:text-slate-200'
              }`}>
                {option.text}
              </span>
            </label>
          )
        })}
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          disabled={disabled || !selected}
        >
          <span className="relative z-10 flex items-center gap-2">
            Submit Answer
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
                {evaluation.correct ? '🎉 Correct!' : '❌ Not Quite'}
              </p>
              {evaluation.feedback && (
                <p className="mt-1 text-sm opacity-95">{evaluation.feedback}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
