import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { MCQSetSpec, MCQSetAnswer } from '../../domain/schema'
import { OMIProgress } from '../OMIProgress'
import { useRendererStore } from '../../lib/store'

interface MCQSetProps {
  spec: MCQSetSpec
  answer?: MCQSetAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: MCQSetAnswer) => void
  onSubmit: (answer: MCQSetAnswer) => void
  onReset: () => void
}

export function MCQSet({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: MCQSetProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(answer?.answers || {})
  const [showFeedback, setShowFeedback] = useState(false)
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, boolean>>({}) // Track if each question was answered correctly
  const [fadeIn, setFadeIn] = useState(true)
  const markQuestionSubmitted = useRendererStore((state) => state.markQuestionSubmitted)

  const currentQuestion = spec.questions[currentQuestionIndex]
  const totalQuestions = spec.questions.length
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1
  const allAnswered = spec.questions.every((q) => answers[q.id])
  const currentAnswer = answers[currentQuestion.id]
  const hasSubmittedCurrent = questionFeedback[currentQuestion.id] !== undefined

  // Fade in effect when question changes with slide animation
  useEffect(() => {
    setFadeIn(false)
    const timer = setTimeout(() => setFadeIn(true), 100)
    return () => clearTimeout(timer)
  }, [currentQuestionIndex])

  useEffect(() => {
    if (evaluation) {
      setShowFeedback(false)
      setTimeout(() => setShowFeedback(true), 50)
    }
  }, [evaluation])

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    const newAnswers = { ...answers, [questionId]: optionId }
    setAnswers(newAnswers)
    onAnswerChange({ answers: newAnswers })
    // Clear feedback for this question when changing answer
    const newFeedback = { ...questionFeedback }
    delete newFeedback[questionId]
    setQuestionFeedback(newFeedback)
  }

  const handleSubmitQuestion = () => {
    if (!currentAnswer) return
    
    const isCorrect = currentAnswer === currentQuestion.correctOptionId
    const newFeedback = { ...questionFeedback, [currentQuestion.id]: isCorrect }
    setQuestionFeedback(newFeedback)
    
    // Mark question as submitted for progress tracking
    markQuestionSubmitted(spec.id, currentQuestion.id, isCorrect)
    
    // Auto-advance to next question if correct and not the last question
    if (isCorrect && !isLastQuestion) {
      setTimeout(() => {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      }, 1500) // Wait 1.5 seconds to show feedback before advancing
    }
  }

  const handleTryAgain = () => {
    // Clear the current question's answer and feedback
    const newAnswers = { ...answers }
    delete newAnswers[currentQuestion.id]
    setAnswers(newAnswers)
    onAnswerChange({ answers: newAnswers })
    
    const newFeedback = { ...questionFeedback }
    delete newFeedback[currentQuestion.id]
    setQuestionFeedback(newFeedback)
  }

  const handleSubmitAll = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!allAnswered) return
    onSubmit({ answers })
  }

  const handleResetAll = () => {
    setAnswers({})
    setQuestionFeedback({})
    setCurrentQuestionIndex(0)
    setShowFeedback(false)
    onReset()
  }

  const isCorrectOption = (optionId: string) => {
    return hasSubmittedCurrent && currentQuestion.correctOptionId === optionId
  }

  const isSelectedWrong = (optionId: string) => {
    return hasSubmittedCurrent && questionFeedback[currentQuestion.id] === false && currentAnswer === optionId
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmitAll}>
      {/* Simple Progress Bar */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ 
            width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` 
          }}
        />
      </div>

      {/* Question Set Header */}
      <div className={`space-y-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 transition-all duration-500 transform ${fadeIn ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {currentQuestion.title && (
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {currentQuestion.title}
                </h3>
              )}
              {currentQuestion.prompt && (
                <p className="mt-2 text-base text-slate-800 dark:text-slate-200">
                  {currentQuestion.prompt}
                </p>
              )}
            </div>
            {currentQuestion.omiMapping && currentQuestion.omiMapping.length > 0 && (
              <OMIProgress spec={spec} currentOmiIds={currentQuestion.omiMapping} />
            )}
          </div>
        </div>

        <fieldset className="space-y-3" disabled={disabled || hasSubmittedCurrent}>
          <legend className="sr-only">Answer options</legend>
          {currentQuestion.options.map((option) => {
            const isSelected = currentAnswer === option.id
            const isCorrect = isCorrectOption(option.id)
            const isWrong = isSelectedWrong(option.id)
            
            return (
              <label
                key={option.id}
                className={`
                  group flex items-start gap-4 rounded-lg border p-4 transition-all duration-200 cursor-pointer
                  ${
                    isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : isWrong
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 hover:border-indigo-300'
                  }
                  ${disabled || hasSubmittedCurrent ? 'cursor-not-allowed opacity-75' : ''}
                `}
              >
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option.id}
                    checked={isSelected}
                    onChange={() => handleAnswerSelect(currentQuestion.id, option.id)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-slate-300 bg-white transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-700"
                    disabled={disabled || hasSubmittedCurrent}
                  />
                  {isSelected && !hasSubmittedCurrent && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="h-2.5 w-2.5 rounded-full bg-white"></div>
                    </div>
                  )}
                  {isCorrect && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  {isWrong && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className={`flex-1 text-base font-medium transition-colors ${
                  isCorrect ? 'text-green-700 dark:text-green-300' :
                  isWrong ? 'text-red-700 dark:text-red-300' :
                  isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'
                }`}>
                  {option.text}
                </span>
              </label>
            )
          })}
        </fieldset>

        {/* Question Feedback */}
        {hasSubmittedCurrent && (
          <div className={`rounded-lg p-4 ${
            questionFeedback[currentQuestion.id]
              ? 'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900/50'
              : 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50'
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {questionFeedback[currentQuestion.id] ? (
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${
                  questionFeedback[currentQuestion.id]
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {questionFeedback[currentQuestion.id] ? '✓ Correct!' : '✗ Not quite right'}
                </p>
                {currentQuestion.explanation && (
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation and Submit */}
      <div className="flex items-center justify-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-3">
          {!hasSubmittedCurrent ? (
            <button
              type="button"
              onClick={handleSubmitQuestion}
              disabled={disabled || !currentAnswer}
              className="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Submit Answer
            </button>
          ) : questionFeedback[currentQuestion.id] === false ? (
            <button
              type="button"
              onClick={handleTryAgain}
              className="rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Try Again
            </button>
          ) : !isLastQuestion ? (
            <span className="px-6 py-2 text-sm text-green-600 dark:text-green-400 font-medium">
              Moving to next question...
            </span>
          ) : (
            <button
              type="submit"
              disabled={disabled || !allAnswered}
              className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-green-500 dark:hover:bg-green-600"
            >
              ✓ Submit All
            </button>
          )}
          {evaluation && (
            <button
              type="button"
              onClick={handleResetAll}
              className="rounded-lg border border-indigo-600 bg-transparent px-4 py-2 font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
            >
              Start Over
            </button>
          )}
        </div>
      </div>

      {/* Final Feedback - only shown after submitting all */}
      {evaluation && showFeedback && (
        <div className={`rounded-lg border p-6 ${
          evaluation.correct 
            ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/50'
            : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/50'
        }`}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {evaluation.correct ? (
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className={`text-lg font-semibold ${
                evaluation.correct
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-amber-800 dark:text-amber-200'
              }`}>
                {evaluation.correct ? '🎉 Perfect! All Correct!' : '📊 Quiz Complete'}
              </p>
              {evaluation.feedback && (
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{evaluation.feedback}</p>
              )}
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                Score: {Math.round(evaluation.score * 100)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
