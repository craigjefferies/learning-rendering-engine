import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gameSpecSchema } from '../domain/schema'
import type { AnswerPayload, GameSpec, MCQAnswer, OrderingAnswer, PairMatchAnswer } from '../domain/schema'
import type { EvaluationResult, RendererEventListener } from '../domain/events'
import { scoreGame } from '../domain/scoring'
import { useRendererStore } from '../lib/store'
import { MCQ } from './games/MCQ'
import { Ordering } from './games/Ordering'
import { PairMatch } from './games/PairMatch'

interface GameRendererProps {
  spec: unknown
  onEvent?: RendererEventListener
}

export function GameRenderer({ spec, onEvent }: GameRendererProps) {
  const parsed = useMemo(() => gameSpecSchema.safeParse(spec), [spec])
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  const copyJson = async () => {
    try {
      if (!navigator?.clipboard) {
        throw new Error('Clipboard API unavailable')
      }
      await navigator.clipboard.writeText(JSON.stringify(spec, null, 2))
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch (error) {
      console.error('Failed to copy spec', error)
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 1500)
    }
  }

  if (!parsed.success) {
    const errorDetails = JSON.stringify(parsed.error.format(), null, 2)
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-200">
        <h2 className="text-lg font-semibold">Invalid game specification</h2>
        <p className="mt-2">The provided JSON does not match the required schema.</p>
        <details className="mt-3">
          <summary className="cursor-pointer text-red-600 underline">Validation details</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-white/70 p-3 text-xs text-red-800 dark:bg-slate-900 dark:text-red-200">
            {errorDetails}
          </pre>
        </details>
        <button
          type="button"
          onClick={copyJson}
          className="mt-4 rounded-md border border-red-300 px-3 py-1 text-red-700 transition hover:bg-red-100 dark:border-red-400 dark:hover:bg-red-900/50"
        >
          {copyState === 'copied' ? 'Copied!' : copyState === 'error' ? 'Copy failed' : 'Copy JSON'}
        </button>
      </div>
    )
  }

  const validatedSpec = parsed.data
  const specId = validatedSpec.id
  const timeLimit = validatedSpec.timeLimitSec

  const { setAnswer, setEvaluation, clearAnswer, clearEvaluation, initTimer, tickTimer, stopTimer, resetGame } =
    useRendererStore((state) => ({
      setAnswer: state.setAnswer,
      setEvaluation: state.setEvaluation,
      clearAnswer: state.clearAnswer,
      clearEvaluation: state.clearEvaluation,
      initTimer: state.initTimer,
      tickTimer: state.tickTimer,
      stopTimer: state.stopTimer,
      resetGame: state.resetGame,
    }))

  const answerEnvelope = useRendererStore((state) => state.answers[specId])
  const evaluation = useRendererStore((state) => state.evaluations[specId])
  const timer = useRendererStore((state) => state.timers[specId])

  const readyEmittedRef = useRef(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    readyEmittedRef.current = false
    return () => {
      resetGame(specId)
    }
  }, [specId, resetGame])

  useEffect(() => {
    if (readyEmittedRef.current) return
    readyEmittedRef.current = true
    onEvent?.({ kind: 'ready', gameId: specId })
  }, [specId, onEvent])

  useEffect(() => {
    if (!timeLimit) return

    initTimer(specId, timeLimit)

    intervalRef.current = window.setInterval(() => {
      const remaining = tickTimer(specId)
      if (remaining === undefined) {
        return
      }
      if (remaining === 0) {
        stopTimer(specId)
        onEvent?.({ kind: 'time.expired', gameId: specId })
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      stopTimer(specId)
    }
  }, [specId, timeLimit, initTimer, tickTimer, stopTimer, onEvent])

  const isTimeExpired = Boolean(timer && timer.remainingSec === 0)

  const handleSubmit = useCallback(
    (payload: AnswerPayload['payload']) => {
      const envelope: AnswerPayload = { type: validatedSpec.type, payload } as AnswerPayload
      setAnswer(specId, envelope)
      onEvent?.({ kind: 'answer.submitted', gameId: specId, payload: envelope })
      onEvent?.({ kind: 'evaluate.requested', gameId: specId })
      const result = scoreGame(validatedSpec, envelope)
      if (result) {
        setEvaluation(specId, result)
        stopTimer(specId)
      }
    },
    [validatedSpec, specId, setAnswer, onEvent, setEvaluation, stopTimer],
  )

  const handleReset = useCallback(() => {
    clearAnswer(specId)
    clearEvaluation(specId)
  }, [specId, clearAnswer, clearEvaluation])

  const handleAnswerChange = useCallback(
    (payload: AnswerPayload['payload']) => {
      const envelope: AnswerPayload = { type: validatedSpec.type, payload } as AnswerPayload
      setAnswer(specId, envelope)
      if (evaluation) {
        clearEvaluation(specId)
      }
    },
    [validatedSpec, specId, setAnswer, evaluation, clearEvaluation],
  )

  const currentAnswer = answerEnvelope && answerEnvelope.type === validatedSpec.type ? answerEnvelope.payload : undefined

  return (
    <section className="w-full max-w-3xl space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-md dark:border-slate-700 dark:bg-slate-900">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            {validatedSpec.title && <h1 className="text-2xl font-semibold">{validatedSpec.title}</h1>}
            {validatedSpec.metadata?.subject && (
              <p className="text-sm text-slate-500 dark:text-slate-300">{validatedSpec.metadata.subject}</p>
            )}
          </div>
          {timeLimit && (
            <div className="flex items-center gap-2 rounded-md border border-indigo-500 px-3 py-1 text-sm font-medium text-indigo-600 dark:border-indigo-400 dark:text-indigo-300">
              <span role="img" aria-label="Timer">
                ⏱
              </span>
              <span>{timer?.remainingSec ?? timeLimit}s</span>
            </div>
          )}
        </div>
      </header>

      <div>
        {renderGameComponent({
          spec: validatedSpec,
          answer: currentAnswer,
          evaluation,
          disabled: isTimeExpired || Boolean(evaluation),
          onAnswerChange: handleAnswerChange,
          onSubmit: handleSubmit,
          onReset: handleReset,
        })}
      </div>
    </section>
  )
}

type RenderArgs = {
  spec: GameSpec
  answer: AnswerPayload['payload'] | undefined
  evaluation?: EvaluationResult
  disabled: boolean
  onAnswerChange: (payload: AnswerPayload['payload']) => void
  onSubmit: (payload: AnswerPayload['payload']) => void
  onReset: () => void
}

function renderGameComponent({ spec, answer, evaluation, disabled, onAnswerChange, onSubmit, onReset }: RenderArgs) {
  switch (spec.type) {
    case 'mcq':
      return (
        <MCQ
          spec={spec}
          answer={answer as MCQAnswer | undefined}
          evaluation={evaluation}
          disabled={disabled}
          onAnswerChange={(mcqAnswer) => onAnswerChange(mcqAnswer)}
          onSubmit={(mcqAnswer) => onSubmit(mcqAnswer)}
          onReset={onReset}
        />
      )
    case 'ordering':
      return (
        <Ordering
          spec={spec}
          answer={answer as OrderingAnswer | undefined}
          evaluation={evaluation}
          disabled={disabled}
          onAnswerChange={(orderingAnswer) => onAnswerChange(orderingAnswer)}
          onSubmit={(orderingAnswer) => onSubmit(orderingAnswer)}
          onReset={onReset}
        />
      )
    case 'pair-match':
      return (
        <PairMatch
          spec={spec}
          answer={answer as PairMatchAnswer | undefined}
          evaluation={evaluation}
          disabled={disabled}
          onAnswerChange={(pairMatchAnswer) => onAnswerChange(pairMatchAnswer)}
          onSubmit={(pairMatchAnswer) => onSubmit(pairMatchAnswer)}
          onReset={onReset}
        />
      )
    default:
      return <p className="text-sm text-red-600">Unsupported game type: {(spec as GameSpec).type}</p>
  }
}
