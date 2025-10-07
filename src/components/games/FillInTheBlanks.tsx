import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { FillInTheBlanksSpec, FillInTheBlanksAnswer } from '../../domain/schema'
import { useRendererStore } from '../../lib/store'

interface FillInTheBlanksProps {
  spec: FillInTheBlanksSpec
  answer?: FillInTheBlanksAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: FillInTheBlanksAnswer) => void
  onSubmit: (answer: FillInTheBlanksAnswer) => void
  onReset: () => void
}

export function FillInTheBlanks({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: FillInTheBlanksProps) {
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(answer?.answers || {})
  const [draggedWord, setDraggedWord] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [shuffledWordBank, setShuffledWordBank] = useState<string[]>([])
  const markQuestionSubmitted = useRendererStore((state) => state.markQuestionSubmitted)

  const currentSentence = spec.sentences[currentSentenceIndex]
  const totalSentences = spec.sentences.length
  const isLastSentence = currentSentenceIndex === totalSentences - 1
  const isFirstSentence = currentSentenceIndex === 0
  const allAnswered = spec.sentences.every((s) => answers[s.id])

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // Shuffle word bank on mount
  useEffect(() => {
    setShuffledWordBank(shuffleArray(spec.word_bank))
  }, [spec.word_bank])

  useEffect(() => {
    if (evaluation) {
      setShowFeedback(false)
      setTimeout(() => setShowFeedback(true), 50)
    }
  }, [evaluation])

  const handleDragStart = (word: string) => {
    if (disabled || evaluation) return
    setDraggedWord(word)
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent, sentenceId: string) => {
    event.preventDefault()
    if (disabled || evaluation || !draggedWord) return

    const newAnswers = { ...answers, [sentenceId]: draggedWord }
    setAnswers(newAnswers)
    onAnswerChange({ answers: newAnswers })
    setDraggedWord(null)
  }

  const handleDragEnd = () => {
    setDraggedWord(null)
  }

  // Check if the current sentence's answer is correct (real-time feedback)
  const isCurrentAnswerCorrect = (): boolean | null => {
    const selectedWord = answers[currentSentence.id]
    if (!selectedWord) return null
    return selectedWord === currentSentence.blank_answer
  }

  const handleRemoveAnswer = (sentenceId: string) => {
    if (disabled || evaluation) return
    const newAnswers = { ...answers }
    delete newAnswers[sentenceId]
    setAnswers(newAnswers)
    onAnswerChange({ answers: newAnswers })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!allAnswered) return
    
    // Mark the last sentence as submitted
    const isCorrect = answers[currentSentence.id] === currentSentence.blank_answer
    if (isCorrect) {
      markQuestionSubmitted(spec.id, currentSentence.id, true)
    }
    
    onSubmit({ answers })
  }

  const handleTryAgain = () => {
    setAnswers({})
    setShowFeedback(false)
    setCurrentSentenceIndex(0)
    onReset()
  }

  const handleNext = () => {
    if (!isLastSentence) {
      // Mark current sentence as submitted before moving to next
      const isCorrect = answers[currentSentence.id] === currentSentence.blank_answer
      if (answers[currentSentence.id] && isCorrect) {
        markQuestionSubmitted(spec.id, currentSentence.id, true)
      }
      setCurrentSentenceIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstSentence) {
      setCurrentSentenceIndex((prev) => prev - 1)
    }
  }

  // Words that are already used
  const usedWords = new Set(Object.values(answers))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Simple Progress Bar */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ 
            width: `${((currentSentenceIndex + 1) / totalSentences) * 100}%` 
          }}
        />
      </div>

      <div className="space-y-4">
        {spec.prompt && (
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            {spec.prompt}
          </p>
        )}

        {/* Instructions */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            💡 Drag a word from the word bank into the blank space to complete the sentence.
          </p>
        </div>

        {/* Current Sentence with blank */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-lg leading-relaxed">
            {currentSentence.text.map((segment, idx) => {
              const selectedWord = answers[currentSentence.id]
              const answerStatus = isCurrentAnswerCorrect()
              const isCorrect = answerStatus === true
              const isIncorrect = answerStatus === false

              return (
                <span key={idx} className="text-slate-800 dark:text-slate-200">
                  {segment}
                  {idx < currentSentence.text.length - 1 && (
                    <span
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, currentSentence.id)}
                      className={`ml-2 inline-flex min-w-[240px] items-center justify-center rounded-lg border-2 border-dashed px-6 py-3 font-semibold transition-all ${
                        selectedWord
                          ? isCorrect
                            ? 'border-green-500 bg-green-100 text-green-800 dark:border-green-400 dark:bg-green-950/50 dark:text-green-200'
                            : isIncorrect
                              ? 'border-red-500 bg-red-100 text-red-800 dark:border-red-400 dark:bg-red-950/50 dark:text-red-200'
                              : 'border-indigo-400 bg-indigo-50 text-indigo-800 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-200'
                          : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-500 dark:hover:border-indigo-500'
                      }`}
                    >
                      {selectedWord ? (
                        <span className="flex items-center gap-2">
                          {isCorrect && <span className="text-green-600 dark:text-green-400">✓</span>}
                          {isIncorrect && <span className="text-red-600 dark:text-red-400">✗</span>}
                          <span>{selectedWord}</span>
                          {!evaluation && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAnswer(currentSentence.id)}
                              className="rounded-full bg-slate-200 p-1 text-slate-600 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm">Drop word here</span>
                      )}
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>

        {/* Word Bank */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Word Bank
          </h3>
          <div className="flex flex-wrap gap-3">
            {shuffledWordBank.map((word) => {
              const isUsed = usedWords.has(word)
              return (
                <div
                  key={word}
                  draggable={!isUsed && !disabled && !evaluation}
                  onDragStart={() => handleDragStart(word)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-lg border px-4 py-2 font-medium transition-all ${
                    isUsed
                      ? 'border-slate-300 bg-slate-200 text-slate-400 opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                      : draggedWord === word
                        ? 'border-purple-500 bg-purple-100 opacity-50 dark:border-purple-400 dark:bg-purple-950/50'
                        : 'border-indigo-400 bg-white text-indigo-700 hover:border-indigo-600 hover:bg-indigo-50 dark:border-indigo-500 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-950/50'
                  } ${
                    !isUsed && !disabled && !evaluation ? 'cursor-move' : 'cursor-not-allowed'
                  }`}
                >
                  {word}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      {!evaluation && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isFirstSentence}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            ← Previous
          </button>

          {!isLastSentence ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={!allAnswered || disabled}
              className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-green-500 dark:hover:bg-green-600"
            >
              {allAnswered ? '✓ Submit All Answers' : `Fill ${spec.sentences.length - Object.keys(answers).length} more`}
            </button>
          )}
        </div>
      )}

      {/* Feedback */}
      {evaluation && showFeedback && (
        <div
          className={`rounded-lg border p-6 transition-all ${
            evaluation.correct
              ? 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/50'
              : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/50'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl ${
                evaluation.correct
                  ? 'bg-green-500 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {evaluation.correct ? '✓' : '○'}
            </div>
            <div className="flex-1 space-y-2">
              <p
                className={`text-base font-semibold ${
                  evaluation.correct
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-amber-800 dark:text-amber-200'
                }`}
              >
                {evaluation.feedback}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Score: {Math.round(evaluation.score * 100)}%
              </p>
              {!evaluation.correct && (
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
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
