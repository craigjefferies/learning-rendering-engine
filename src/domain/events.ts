import type { AnswerPayload } from './schema'

export type OMIMasteryLevel = 'not-yet' | 'emerging' | 'proficient' | 'mastered'

export interface OMIEvidence {
  omiId: string
  demonstrated: boolean
  accuracy: number // 0-1
  timestamp: string
}

export type RendererEvent =
  | { kind: 'ready'; gameId: string }
  | { kind: 'answer.submitted'; gameId: string; payload: AnswerPayload }
  | { kind: 'evaluate.requested'; gameId: string }
  | { kind: 'time.expired'; gameId: string }
  | { kind: 'omi.evidence'; gameId: string; evidence: OMIEvidence[] }
  | { kind: 'game.completed'; gameId: string; score: number }

export type RendererEventListener = (event: RendererEvent) => void

export interface EvaluationResult {
  gameId: string
  correct: boolean
  score: number
  feedback?: string
  omiEvidence?: OMIEvidence[] // Evidence for OMIs assessed by this game
}

export type EvaluationCallback = (result: EvaluationResult) => void
