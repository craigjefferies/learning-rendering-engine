import { useState, useEffect } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { PairMatchSetSpec, PairMatchSetAnswer } from '../../domain/schema'
import { OMIProgress } from '../OMIProgress'
import { useRendererStore } from '../../lib/store'

interface PairMatchSetProps {
  spec: PairMatchSetSpec
  answer?: PairMatchSetAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: PairMatchSetAnswer) => void
  onSubmit: (answer: PairMatchSetAnswer) => void
  onReset: () => void
}

export function PairMatchSet({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: PairMatchSetProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Array<{ left: string; right: string }>>>(answer?.answers || {})
  const [showFeedback, setShowFeedback] = useState(false)
  const [fadeIn, setFadeIn] = useState(true)
  const markQuestionSubmitted = useRendererStore((state) => state.markQuestionSubmitted)

  // For the current question's matching state
  const [matches, setMatches] = useState<Map<string, string>>(new Map())
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [shuffledRightItems, setShuffledRightItems] = useState<string[]>([])

  const currentQuestion = spec.questions[currentQuestionIndex]
  const totalQuestions = spec.questions.length
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1
  const allAnswered = spec.questions.every((q) => {
    const questionMatches = answers[q.id]
    return questionMatches && questionMatches.length === q.pairs.length
  })

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Fade in effect when question changes with slide animation
  useEffect(() => {
    setFadeIn(false)
    const timer = setTimeout(() => setFadeIn(true), 100)
    return () => clearTimeout(timer)
  }, [currentQuestionIndex])

  // Shuffle right items when question changes
  useEffect(() => {
    const allRightItems = [
      ...currentQuestion.pairs.map((p) => p.right),
      ...(currentQuestion.distractorsRight || []),
    ]
    setShuffledRightItems(shuffleArray(allRightItems))
  }, [currentQuestionIndex, currentQuestion])

  // Initialize matches from saved answer when question changes
  useEffect(() => {
    const savedMatches = answers[currentQuestion.id]
    if (savedMatches) {
      setMatches(new Map(savedMatches.map((m) => [m.left, m.right])))
    } else {
      setMatches(new Map())
    }
    setSelectedLeft(null)
  }, [currentQuestionIndex, currentQuestion.id, answers])

  useEffect(() => {
    if (evaluation) {
      setShowFeedback(false)
      setTimeout(() => setShowFeedback(true), 50)
    }
  }, [evaluation])

  const saveCurrentQuestionMatches = (newMatches: Map<string, string>) => {
    const matchesArray = Array.from(newMatches.entries()).map(([left, right]) => ({ left, right }))
    const newAnswers = { ...answers, [currentQuestion.id]: matchesArray }
    setAnswers(newAnswers)
    onAnswerChange({ answers: newAnswers })
  }

  const handleLeftClick = (leftItem: string) => {
    if (disabled || evaluation) return
    setSelectedLeft(leftItem)
  }

  const handleRightClick = (rightItem: string) => {
    if (disabled || evaluation || !selectedLeft) return
    
    const newMatches = new Map(matches)
    
    // Remove any existing match with this right item
    for (const [left, right] of newMatches.entries()) {
      if (right === rightItem) {
        newMatches.delete(left)
      }
    }
    
    // Set the new match
    newMatches.set(selectedLeft, rightItem)
    setMatches(newMatches)
    saveCurrentQuestionMatches(newMatches)
    setSelectedLeft(null)
    
    // Check if all pairs are correctly matched - auto-advance if so
    if (newMatches.size === currentQuestion.pairs.length && !isLastQuestion) {
      const allCorrect = currentQuestion.pairs.every(pair => {
        const selectedRight = newMatches.get(pair.left)
        return selectedRight === pair.right
      })
      
      if (allCorrect) {
        // Mark question as submitted before advancing
        markQuestionSubmitted(spec.id, currentQuestion.id, true)
        setTimeout(() => {
          setCurrentQuestionIndex(currentQuestionIndex + 1)
        }, 1500) // Wait 1.5 seconds to show all green checkmarks before advancing
      }
    }
  }

  // Check if a match is correct
  const isMatchCorrect = (leftItem: string): boolean => {
    const selectedRight = matches.get(leftItem)
    if (!selectedRight) return false
    
    const correctPair = currentQuestion.pairs.find(p => p.left === leftItem)
    return correctPair?.right === selectedRight
  }

  const handleRemoveMatch = (leftItem: string) => {
    if (disabled || evaluation) return
    const newMatches = new Map(matches)
    newMatches.delete(leftItem)
    setMatches(newMatches)
    saveCurrentQuestionMatches(newMatches)
  }

  const handleSubmit = () => {
    if (!allAnswered) return
    
    // Mark the last question as submitted
    const allCorrect = currentQuestion.pairs.every(pair => {
      const selectedRight = matches.get(pair.left)
      return selectedRight === pair.right
    })
    if (allCorrect) {
      markQuestionSubmitted(spec.id, currentQuestion.id, true)
    }
    
    onSubmit({ answers })
  }

  const handleTryAgain = () => {
    setAnswers({})
    setMatches(new Map())
    setCurrentQuestionIndex(0)
    setShowFeedback(false)
    setSelectedLeft(null)
    onReset()
  }

  // Get matched right items
  const matchedRightItems = new Set(matches.values())

  return (
    <div className="space-y-6">
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
      <div className={`space-y-4 transition-all duration-500 transform ${fadeIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {currentQuestion.title && (
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {currentQuestion.title}
              </h3>
            )}
          </div>
          {currentQuestion.omiMapping && currentQuestion.omiMapping.length > 0 && (
            <OMIProgress spec={spec} currentOmiIds={currentQuestion.omiMapping} />
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            💡 Click an item on the left, then click its matching item on the right. 
            {selectedLeft && <span className="ml-2 font-bold">Selected: {selectedLeft}</span>}
          </p>
        </div>

        {/* Matching Interface */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Items
            </h4>
            {currentQuestion.pairs.map((pair) => {
              const isMatched = matches.has(pair.left)
              const isSelected = selectedLeft === pair.left
              return (
                <div key={pair.left} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleLeftClick(pair.left)}
                    disabled={disabled || Boolean(evaluation)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-100 shadow-lg dark:border-indigo-400 dark:bg-indigo-900/50'
                        : isMatched
                          ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-950/30'
                          : 'border-slate-300 bg-white hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-indigo-500'
                    } ${disabled || evaluation ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {pair.left}
                    </span>
                  </button>
                  {isMatched && (
                    <div className={`flex items-center gap-2 rounded-lg p-2 ${
                      isMatchCorrect(pair.left)
                        ? 'bg-green-100 dark:bg-green-950/50'
                        : 'bg-red-100 dark:bg-red-950/50'
                    }`}>
                      <span className={isMatchCorrect(pair.left) 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                      }>
                        {isMatchCorrect(pair.left) ? '✓' : '✗'}
                      </span>
                      <span className={`flex-1 text-sm ${
                        isMatchCorrect(pair.left)
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {matches.get(pair.left)}
                      </span>
                      {!isMatchCorrect(pair.left) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMatch(pair.left)}
                          disabled={disabled || Boolean(evaluation)}
                          className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                          title="Remove match"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Matches
            </h4>
            {shuffledRightItems.map((rightItem) => {
              const isMatched = matchedRightItems.has(rightItem)
              const isClickable = selectedLeft && !disabled && !evaluation
              return (
                <button
                  key={rightItem}
                  type="button"
                  onClick={() => handleRightClick(rightItem)}
                  disabled={!isClickable}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    isMatched
                      ? 'border-green-300 bg-green-50 opacity-50 dark:border-green-600 dark:bg-green-950/30'
                      : isClickable
                        ? 'border-slate-300 bg-white hover:border-purple-400 hover:bg-purple-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-purple-500 dark:hover:bg-purple-950/30'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50'
                  } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {rightItem}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center gap-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        {!isLastQuestion ? (
          <div className="text-sm text-slate-600 dark:text-slate-400 py-2">
            {matches.size === currentQuestion.pairs.length && 
             currentQuestion.pairs.every(pair => matches.get(pair.left) === pair.right) ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                ✓ All correct! Moving to next question...
              </span>
            ) : (
              <span>
                Match {currentQuestion.pairs.length - matches.size} more {currentQuestion.pairs.length - matches.size === 1 ? 'pair' : 'pairs'}
              </span>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered || disabled || Boolean(evaluation)}
            className="rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:from-green-700 hover:to-green-800 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500"
          >
            {allAnswered ? '✓ Submit All Answers' : `Answer ${totalQuestions - Object.keys(answers).filter((qId) => {
              const q = spec.questions.find((sq) => sq.id === qId)
              return q && answers[qId].length === q.pairs.length
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
    </div>
  )
}
