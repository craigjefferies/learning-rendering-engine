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

  useEffect(() => {
    if (answer?.optionId) {
      setSelected(answer.optionId)
    }
  }, [answer?.optionId])

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
    onReset()
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        {spec.prompt && <p className="text-lg font-medium">{spec.prompt}</p>}
        {spec.instructions && <p className="text-sm text-slate-500 dark:text-slate-300">{spec.instructions}</p>}
      </div>

      <fieldset className="space-y-3" disabled={disabled}>
        <legend className="sr-only">Multiple choice options</legend>
        {spec.options.map((option) => (
          <label
            key={option.id}
            className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-400 ${
              selected === option.id ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-700' : ''
            }`}
          >
            <input
              type="radio"
              name={`mcq-${spec.id}`}
              value={option.id}
              checked={selected === option.id}
              onChange={() => handleChange(option.id)}
              className="h-4 w-4"
            />
            <span className="text-base">{option.text}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={disabled || !selected}
        >
          Submit
        </button>
        {evaluation && (
          <button
            type="button"
            onClick={handleTryAgain}
            className="rounded-md border border-indigo-600 px-4 py-2 text-indigo-600 transition hover:bg-indigo-50 dark:hover:bg-slate-800"
          >
            Try again
          </button>
        )}
      </div>

      <div className="aria-live" aria-live="polite" aria-atomic="true">
        {evaluation && (
          <p className={evaluation.correct ? 'text-sm font-medium text-emerald-600' : 'text-sm font-medium text-red-600'}>
            {evaluation.feedback}
          </p>
        )}
      </div>
    </form>
  )
}
