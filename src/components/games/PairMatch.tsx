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
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    setMatches(initialMatches)
  }, [initialMatches])

  useEffect(() => {
    if (evaluation) {
      setShowFeedback(false)
      setTimeout(() => setShowFeedback(true), 50)
    }
  }, [evaluation])

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
      const newAnswer = { matches: next }
      onAnswerChange(newAnswer)
      return newAnswer
    })
  }

  const handleSubmit = () => {
    onSubmit(matches)
  }

  const handleTryAgain = () => {
    setMatches({ matches: spec.pairs.map((pair) => ({ left: pair.left, right: '' })) })
    setShowFeedback(false)
    onReset()
  }

  const isMatchCorrect = (index: number) => {
    if (!evaluation) return false
    const expectedPair = spec.pairs[index]
    const actualMatch = matches.matches[index]
    return expectedPair && actualMatch && expectedPair.right === actualMatch.right
  }

  const isMatchIncorrect = (index: number) => {
    if (!evaluation || !evaluation.correct) {
      const expectedPair = spec.pairs[index]
      const actualMatch = matches.matches[index]
      return evaluation && expectedPair && actualMatch && actualMatch.right && expectedPair.right !== actualMatch.right
    }
    return false
  }

  const allMatched = matches.matches.every(m => m.right !== '')

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-3">
        {spec.prompt && (
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{spec.prompt}</p>
        )}
        {spec.instructions && (
          <p className="text-sm text-slate-600 dark:text-slate-400">{spec.instructions}</p>
        )}
      </div>

      <div className="space-y-4" role="group" aria-label="Match the terms to their definitions">
        {matches.matches.map((match, index) => {
          const isCorrect = isMatchCorrect(index)
          const isIncorrect = isMatchIncorrect(index)
          
          return (
            <div
              key={`${match.left}-${index}`}
              style={{ animationDelay: `${index * 50}ms` }}
              className={`
                flex flex-col gap-3 rounded-xl border-2 p-4 shadow-sm transition-all duration-200
                animate-slide-in
                ${
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg shadow-emerald-500/20'
                    : isIncorrect
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30 shadow-lg shadow-red-500/20'
                    : match.right
                    ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-700'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                }
                sm:flex-row sm:items-center sm:justify-between
              `}
            >
              <div className="flex items-center gap-3 sm:flex-1">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 font-bold text-white shadow-sm">
                  {index + 1}
                </div>
                <span className={`text-base font-semibold transition-colors ${
                  isCorrect ? 'text-emerald-700 dark:text-emerald-300' :
                  isIncorrect ? 'text-red-700 dark:text-red-300' :
                  'text-slate-700 dark:text-slate-200'
                }`}>
                  {match.left}
                </span>
              </div>
              
              <div className="relative flex items-center gap-2 sm:flex-1">
                <svg className="hidden h-5 w-5 text-slate-400 dark:text-slate-500 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <select
                  value={match.right}
                  onChange={(event) => handleSelect(index, event.target.value)}
                  disabled={disabled}
                  className={`
                    w-full flex-1 rounded-lg border-2 px-4 py-2.5 text-base font-medium shadow-sm transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    disabled:cursor-not-allowed disabled:opacity-50
                    ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : isIncorrect
                        ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                        : match.right
                        ? 'border-indigo-400 bg-white text-slate-700 dark:border-indigo-600 dark:bg-slate-700 dark:text-slate-200'
                        : 'border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400'
                    }
                  `}
                >
                  <option value="" disabled>
                    Select a match...
                  </option>
                  {rightOptions.map((option) => (
                    <option key={`${match.left}-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {isCorrect && (
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-emerald-600 animate-scale-in" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {isIncorrect && (
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-600 animate-scale-in" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          disabled={disabled || !allMatched}
        >
          <span className="relative z-10 flex items-center gap-2">
            Submit Matches
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
                {evaluation.correct ? '🎉 Perfect Matching!' : '❌ Not Quite'}
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
