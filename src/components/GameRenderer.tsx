import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gameSpecSchema } from '../domain/schema'
import type { AnswerPayload, GameSpec, MCQAnswer, MCQSetAnswer, OrderingAnswer, OrderingSetAnswer, PairMatchAnswer, PairMatchSetAnswer, FillInTheBlanksAnswer, ActivitySetAnswer, ClassificationSetAnswer } from '../domain/schema'
import type { EvaluationResult, RendererEventListener } from '../domain/events'
import { scoreGame } from '../domain/scoring'
import { useRendererStore } from '../lib/store'
import { MCQ } from './games/MCQ'
import { MCQSet } from './games/MCQSet'
import { Ordering } from './games/Ordering'
import { OrderingSet } from './games/OrderingSet'
import { PairMatch } from './games/PairMatch'
import { PairMatchSet } from './games/PairMatchSet'
import { FillInTheBlanks } from './games/FillInTheBlanks'
import { ActivitySet } from './games/ActivitySet'
import { ClassificationSet } from './games/ClassificationSet'
import { OMIProgress } from './OMIProgress'

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
  const timeLimit = 'timeLimitSec' in validatedSpec ? validatedSpec.timeLimitSec : undefined

  const setAnswer = useRendererStore((state) => state.setAnswer)
  const setEvaluation = useRendererStore((state) => state.setEvaluation)
  const clearAnswer = useRendererStore((state) => state.clearAnswer)
  const clearEvaluation = useRendererStore((state) => state.clearEvaluation)
  const initTimer = useRendererStore((state) => state.initTimer)
  const tickTimer = useRendererStore((state) => state.tickTimer)
  const stopTimer = useRendererStore((state) => state.stopTimer)
  const resetGame = useRendererStore((state) => state.resetGame)
  const recordOMIEvidence = useRendererStore((state) => state.recordOMIEvidence)

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
        
        // Record OMI evidence if present
        if (result.omiEvidence && result.omiEvidence.length > 0) {
          recordOMIEvidence(result.omiEvidence)
          onEvent?.({ kind: 'omi.evidence', gameId: specId, evidence: result.omiEvidence })
        }
        
        // Emit game completion event
        onEvent?.({ kind: 'game.completed', gameId: specId, score: result.score })
      }
    },
    [validatedSpec, specId, setAnswer, onEvent, setEvaluation, stopTimer, recordOMIEvidence],
  )

  const handleReset = useCallback(() => {
    clearAnswer(specId)
    clearEvaluation(specId)
  }, [specId, clearAnswer, clearEvaluation])

  const handleAnswerChange = useCallback(
    (payload: AnswerPayload['payload']) => {
      const envelope: AnswerPayload = { type: validatedSpec.type, payload } as AnswerPayload
      setAnswer(specId, envelope)
      // Clear evaluation if it exists
      clearEvaluation(specId)
    },
    [validatedSpec, specId, setAnswer, clearEvaluation],
  )

  const currentAnswer = answerEnvelope && answerEnvelope.type === validatedSpec.type ? answerEnvelope.payload : undefined

  return (
    <section className="w-full space-y-6">
      {/* Clean Header */}
      <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex-1">
          {validatedSpec.title && (
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {validatedSpec.title}
            </h2>
          )}
          {validatedSpec.metadata?.subject && (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span>{validatedSpec.metadata.subject}</span>
              {validatedSpec.metadata.difficulty && (
                <>
                  <span>•</span>
                  <span>Level {validatedSpec.metadata.difficulty}</span>
                </>
              )}
            </div>
          )}
        </div>
        {timeLimit && (
          <div className={`
            flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold
            ${
              timer && timer.remainingSec <= 10
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }
          `}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{timer?.remainingSec ?? timeLimit}s</span>
          </div>
        )}
      </div>

      {/* OMI Progress Display */}
      {validatedSpec.metadata?.omis && 
       validatedSpec.metadata.omis.length > 0 && 
       !['mcq-set', 'ordering-set', 'pair-match-set', 'activity-set', 'classification-set'].includes(validatedSpec.type) && (
        <OMIProgress spec={validatedSpec} />
      )}

      {/* Game Content */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
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
    case 'mcq-set':
      return (
        <MCQSet
          spec={spec}
          answer={answer as MCQSetAnswer | undefined}
          evaluation={evaluation}
          disabled={disabled}
          onAnswerChange={(mcqSetAnswer) => onAnswerChange(mcqSetAnswer)}
          onSubmit={(mcqSetAnswer) => onSubmit(mcqSetAnswer)}
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
    case 'ordering-set':
      return (
        <OrderingSet
          spec={spec}
          answer={answer as OrderingSetAnswer | undefined}
          evaluation={evaluation}
          disabled={disabled}
          onAnswerChange={(orderingSetAnswer) => onAnswerChange(orderingSetAnswer)}
          onSubmit={(orderingSetAnswer) => onSubmit(orderingSetAnswer)}
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
    case 'pair-match-set':
      return (
        <PairMatchSet
          spec={spec}
          answer={answer as PairMatchSetAnswer | undefined}
          evaluation={evaluation}
          disabled={disabled}
          onAnswerChange={(pairMatchSetAnswer) => onAnswerChange(pairMatchSetAnswer)}
          onSubmit={(pairMatchSetAnswer) => onSubmit(pairMatchSetAnswer)}
          onReset={onReset}
        />
      )
    case 'fill-in-the-blanks':
      return (
        <FillInTheBlanks
          spec={spec}
          answer={answer as FillInTheBlanksAnswer | undefined}
          evaluation={evaluation}
          disabled={disabled}
          onAnswerChange={(fillAnswer) => onAnswerChange(fillAnswer)}
          onSubmit={(fillAnswer) => onSubmit(fillAnswer)}
          onReset={onReset}
        />
      )
    case 'activity-set':
      return (
        <ActivitySet
          spec={spec}
          answer={answer as ActivitySetAnswer | undefined}
          evaluation={evaluation}
          disabled={disabled}
          onAnswerChange={(activitySetAnswer) => onAnswerChange(activitySetAnswer)}
          onSubmit={(activitySetAnswer) => onSubmit(activitySetAnswer)}
          onReset={onReset}
        />
      )
    case 'classification-set':
      return (
        <ClassificationSet
          spec={spec}
          answer={answer as ClassificationSetAnswer | undefined}
          evaluation={evaluation}
          disabled={disabled}
          onAnswerChange={(classificationSetAnswer) => onAnswerChange(classificationSetAnswer)}
          onSubmit={(classificationSetAnswer) => onSubmit(classificationSetAnswer)}
          onReset={onReset}
        />
      )
    default:
      return <p className="text-sm text-red-600">Unsupported game type: {(spec as GameSpec).type}</p>
  }
}
