import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { EvaluationResult } from '../../domain/events'
import type { ShowdownSetSpec, ShowdownSetAnswer } from '../../domain/schema'
import { useRendererStore } from '../../lib/store'

interface ShowdownSetProps {
  spec: ShowdownSetSpec
  answer?: ShowdownSetAnswer
  disabled?: boolean
  evaluation?: EvaluationResult
  onAnswerChange: (answer: ShowdownSetAnswer) => void
  onSubmit: (answer: ShowdownSetAnswer) => void
  onReset: () => void
}

interface ShowdownState {
  optionId: string | null
  reasonIds: string[]
}

export function ShowdownSet({
  spec,
  answer,
  disabled = false,
  evaluation,
  onAnswerChange,
  onSubmit,
  onReset,
}: ShowdownSetProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [draftAnswers, setDraftAnswers] = useState<Record<string, ShowdownState>>(() => {
    const initial: Record<string, ShowdownState> = {}
    spec.showdowns.forEach((showdown) => {
      const existing = answer?.answers?.[showdown.id]
      initial[showdown.id] = {
        optionId: existing?.optionId ?? null,
        reasonIds: existing?.reasonIds ?? [],
      }
    })
    return initial
  })
  const [fadeIn, setFadeIn] = useState(true)
  const markQuestionSubmitted = useRendererStore((store) => store.markQuestionSubmitted)
  const autoAdvancedRef = useRef<Record<string, boolean>>({})

  const currentShowdown = spec.showdowns[currentIndex]
  const totalShowdowns = spec.showdowns.length
  const isLastShowdown = currentIndex === totalShowdowns - 1
  const isFirstShowdown = currentIndex === 0

  useEffect(() => {
    setFadeIn(false)
    const timer = setTimeout(() => setFadeIn(true), 100)
    return () => clearTimeout(timer)
  }, [currentIndex])

  useEffect(() => {
    if (!answer) return
    const synced: Record<string, ShowdownState> = {}
    spec.showdowns.forEach((showdown) => {
      const existing = answer.answers?.[showdown.id]
      const current = draftAnswers[showdown.id]
      synced[showdown.id] = {
        optionId: existing?.optionId ?? current?.optionId ?? null,
        reasonIds: existing?.reasonIds ?? current?.reasonIds ?? [],
      }
    })
    setDraftAnswers(synced)
    autoAdvancedRef.current = {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(answer?.answers)])

  const showdownById = (showdownId: string) => spec.showdowns.find((sd) => sd.id === showdownId)

  const analyzeReasonSelection = (showdown: ShowdownSetSpec['showdowns'][number], draft: ShowdownState | undefined) => {
    const correctReasonIds = showdown.reasonOptions.filter((reason) => reason.correct).map((reason) => reason.id)
    const requiredReasonCount = correctReasonIds.length
    const selectedIds = draft?.reasonIds ?? []
    const selectedCorrectIds = selectedIds.filter((id) => correctReasonIds.includes(id))
    const selectedCorrectCount = selectedCorrectIds.length
    const hasIncorrectSelection = selectedIds.some((id) => !correctReasonIds.includes(id))
    const allRequiredSelected = selectedCorrectCount === requiredReasonCount
    const onlyCorrectSelected = allRequiredSelected && !hasIncorrectSelection && selectedIds.length === requiredReasonCount

    return {
      requiredReasonCount,
      selectedIds,
      selectedCorrectIds,
      selectedCorrectCount,
      hasIncorrectSelection,
      allRequiredSelected,
      onlyCorrectSelected,
      correctReasonIds,
    }
  }

  const isShowdownComplete = (showdownId: string, answers: Record<string, ShowdownState>) => {
    const showdown = showdownById(showdownId)
    if (!showdown) return false
    const draft = answers[showdownId]
    if (!draft) return false
    if (!draft.optionId) return false

    const reasonStats = analyzeReasonSelection(showdown, draft)
    if (reasonStats.selectedIds.length < reasonStats.requiredReasonCount) return false

    return true
  }

  const updateGlobalAnswer = (updated: Record<string, ShowdownState>) => {
    const payload: ShowdownSetAnswer = {
      answers: Object.fromEntries(
        Object.entries(updated).map(([id, value]) => [id, {
          optionId: value.optionId ?? '',
          reasonIds: value.reasonIds,
        }]),
      ),
    }
    onAnswerChange(payload)
  }

  const handleOptionChange = (showdownId: string, optionId: string) => {
    setDraftAnswers((prev) => {
      autoAdvancedRef.current[showdownId] = false
      const next: Record<string, ShowdownState> = {
        ...prev,
        [showdownId]: {
          optionId,
          reasonIds: prev[showdownId]?.reasonIds ?? [],
        },
      }
      updateGlobalAnswer(next)
      if (isShowdownComplete(showdownId, next) && isShowdownCorrect(showdownId, next)) {
        markQuestionSubmitted(spec.id, showdownId, true)
      }
      return next
    })
  }

  const handleReasonToggle = (showdownId: string, reasonId: string) => {
    setDraftAnswers((prev) => {
      const current = prev[showdownId] ?? { optionId: null, reasonIds: [] }
      const reasonIds = current.reasonIds.includes(reasonId)
        ? current.reasonIds.filter((id) => id !== reasonId)
        : [...current.reasonIds, reasonId]
      autoAdvancedRef.current[showdownId] = false
      const next = {
        ...prev,
        [showdownId]: { optionId: current.optionId, reasonIds },
      }
      updateGlobalAnswer(next)
      if (isShowdownComplete(showdownId, next) && isShowdownCorrect(showdownId, next)) {
        markQuestionSubmitted(spec.id, showdownId, true)
      }
      return next
    })
  }

  const handleResetAll = () => {
    const reset: Record<string, ShowdownState> = {}
    spec.showdowns.forEach((showdown) => {
      reset[showdown.id] = { optionId: null, reasonIds: [] }
    })
    setDraftAnswers(reset)
    autoAdvancedRef.current = {}
    updateGlobalAnswer(reset)
    onReset()
  }

  const handleSubmitAll = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload: ShowdownSetAnswer = {
      answers: Object.fromEntries(
        Object.entries(draftAnswers).map(([id, value]) => [id, {
          optionId: value.optionId ?? '',
          reasonIds: value.reasonIds,
        }]),
      ),
    }
    spec.showdowns.forEach((showdown) => {
      if (isShowdownComplete(showdown.id, draftAnswers)) {
        const correct = isShowdownCorrect(showdown.id, draftAnswers)
        if (correct) {
          markQuestionSubmitted(spec.id, showdown.id, true)
        }
      }
    })
    onSubmit(payload)
  }

  const allComplete = useMemo(() => spec.showdowns.every((sd) => isShowdownComplete(sd.id, draftAnswers)), [spec.showdowns, draftAnswers])

  const isShowdownCorrect = (showdownId: string, answers: Record<string, ShowdownState>) => {
    const showdown = showdownById(showdownId)
    if (!showdown) return false
    const draft = answers[showdownId]
    if (!draft || !draft.optionId) return false

    if (draft.optionId !== showdown.correctOptionId) {
      return false
    }

    const reasonStats = analyzeReasonSelection(showdown, draft)
    return reasonStats.onlyCorrectSelected
  }

  const currentState = draftAnswers[currentShowdown.id] ?? { optionId: null, reasonIds: [] }
  const currentReasonStats = analyzeReasonSelection(currentShowdown, currentState)
  const correctOptionLabel = currentShowdown.options.find((option) => option.id === currentShowdown.correctOptionId)?.label ?? 'the stronger interface'

  const selectedOptionMatches = currentState.optionId === currentShowdown.correctOptionId
  const readyForEvaluation =
    selectedOptionMatches &&
    currentReasonStats.allRequiredSelected &&
    !currentReasonStats.hasIncorrectSelection &&
    currentState.reasonIds.length === currentReasonStats.requiredReasonCount

  const reachedReasonThreshold = currentState.reasonIds.length >= currentReasonStats.requiredReasonCount

  const shouldShowFeedback =
    (!!currentState.optionId &&
      (reachedReasonThreshold || currentReasonStats.hasIncorrectSelection || currentState.reasonIds.length > currentReasonStats.requiredReasonCount))

  const currentFeedbackStatus: 'correct' | 'incorrect' | null = shouldShowFeedback
    ? readyForEvaluation
      ? 'correct'
      : 'incorrect'
    : null

  const interfaceCard = (label: 'interfaceA' | 'interfaceB') => {
    const content = currentShowdown.context[label]
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">{label === 'interfaceA' ? 'Interface A' : 'Interface B'}</div>
        <p className="text-sm font-medium text-zinc-800">{content.summary}</p>
        <ul className="space-y-2 text-sm text-zinc-600">
          {content.details.map((detail) => (
            <li key={detail} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-400" aria-hidden />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const handlePrevious = () => {
    if (disabled) return
    setCurrentIndex((index) => Math.max(index - 1, 0))
  }

  useEffect(() => {
    if (disabled) return
    const showdownId = currentShowdown.id
    if (autoAdvancedRef.current[showdownId]) return
    if (currentFeedbackStatus !== 'correct') return
    if (isLastShowdown) return

    autoAdvancedRef.current[showdownId] = true
    const timer = setTimeout(() => {
      setCurrentIndex((index) => Math.min(index + 1, totalShowdowns - 1))
    }, 800)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFeedbackStatus, currentShowdown.id, disabled, isLastShowdown])
  return (
    <form className="space-y-8" onSubmit={handleSubmitAll}>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all"
          style={{ width: `${((currentIndex + 1) / totalShowdowns) * 100}%` }}
        />
      </div>

      <section
        className={`space-y-6 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-lg ring-1 ring-black/5 transition-all duration-500 ${
          fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Showdown {currentIndex + 1} of {totalShowdowns}
            </p>
            {currentShowdown.title && (
              <h3 className="text-xl font-semibold text-zinc-900">{currentShowdown.title}</h3>
            )}
            <p className="text-sm text-zinc-600">{currentShowdown.prompt}</p>
          </div>
          <div className="min-w-[200px] rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500">
            <p className="font-semibold uppercase tracking-[0.2em]">Key OMIs</p>
            <ul className="mt-2 space-y-1">
              {(currentShowdown.omiMapping ?? ['–']).map((omi) => (
                <li key={omi}>• {omi}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {interfaceCard('interfaceA')}
          {interfaceCard('interfaceB')}
        </div>

        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Choose the stronger interface</p>
          <div className="grid gap-3 md:grid-cols-2">
            {currentShowdown.options.map((option) => {
              const selected = currentState.optionId === option.id
              const optionIsCorrect = option.id === currentShowdown.correctOptionId
              const optionFeedbackClass =
                selected && currentFeedbackStatus === 'correct'
                  ? 'border-emerald-500 bg-emerald-50'
                  : selected && currentFeedbackStatus === 'incorrect'
                  ? 'border-red-500 bg-red-50'
                  : selected
                  ? 'border-zinc-900 bg-zinc-900/5'
                  : currentFeedbackStatus === 'correct' && optionIsCorrect
                  ? 'border-emerald-200 bg-emerald-50/60'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 transition ${
                    optionFeedbackClass
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`showdown-${currentShowdown.id}-option`}
                      value={option.id}
                      checked={selected}
                      disabled={disabled}
                      onChange={() => handleOptionChange(currentShowdown.id, option.id)}
                      className="h-4 w-4 text-zinc-900 focus:ring-zinc-700"
                    />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{option.label}</p>
                      <p className="text-xs text-zinc-600">{option.description}</p>
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Select the reasons that support your verdict
            </p>
            <p className="text-xs text-zinc-500">
              {currentReasonStats.requiredReasonCount > 1
                ? `Choose all ${currentReasonStats.requiredReasonCount} reasons that justify your pick.`
                : 'Choose the reason that best justifies your pick.'}
            </p>
            <p className="text-xs text-zinc-500">
              {currentReasonStats.hasIncorrectSelection
                ? 'One or more selected reasons do not clearly support your verdict—remove them.'
                : `Selected ${currentReasonStats.selectedCorrectCount} of ${currentReasonStats.requiredReasonCount} correct reasons.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentShowdown.reasonOptions.map((reason) => {
              const selected = currentState.reasonIds.includes(reason.id)
              const isCorrectReason = reason.correct
              const reasonFeedbackClass =
                selected
                  ? isCorrectReason
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : isCorrectReason && currentFeedbackStatus === 'correct'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
              return (
                <button
                  key={reason.id}
                  type="button"
                  onClick={() => handleReasonToggle(currentShowdown.id, reason.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    reasonFeedbackClass
                  }`}
                >
                  {reason.label}
                </button>
              )
            })}
          </div>
          {currentFeedbackStatus === 'correct' && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status" aria-live="polite">
              <span className="text-sm font-semibold uppercase tracking-[0.2em]">Correct</span>
              <span>Great justification — {correctOptionLabel} is supported by the right reasons.</span>
            </div>
          )}
          {currentFeedbackStatus === 'incorrect' && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="status" aria-live="polite">
              <span className="text-sm font-semibold uppercase tracking-[0.2em]">Try Again</span>
              <span>Not quite yet. Revisit which interface is strongest and make sure the reasons fully support it.</span>
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isFirstShowdown || disabled}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="text-xs text-zinc-500">
            Moves forward automatically once your reasoning is spot on.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            disabled={disabled}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
          <div className="flex flex-col items-end gap-1">
            <button
              type="submit"
              disabled={disabled || !allComplete}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              Submit Set
            </button>
            {!allComplete && (
              <span className="text-[11px] text-zinc-500">
                Complete each showdown to enable submit.
              </span>
            )}
          </div>
        </div>
      </div>

      {evaluation && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <p className="font-semibold">{evaluation.feedback}</p>
          <p className="mt-1 text-xs text-emerald-600">Score: {Math.round(evaluation.score * 100)}%</p>
        </div>
      )}
    </form>
  )
}
