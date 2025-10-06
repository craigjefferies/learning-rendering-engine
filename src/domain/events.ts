import type { AnswerPayload } from './schema'

export type RendererEvent =
  | { kind: 'ready'; gameId: string }
  | { kind: 'answer.submitted'; gameId: string; payload: AnswerPayload }
  | { kind: 'evaluate.requested'; gameId: string }
  | { kind: 'time.expired'; gameId: string }

export type RendererEventListener = (event: RendererEvent) => void

export interface EvaluationResult {
  gameId: string
  correct: boolean
  score: number
  feedback?: string
}

export type EvaluationCallback = (result: EvaluationResult) => void
