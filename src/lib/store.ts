import { create } from 'zustand'
import type { AnswerPayload } from '../domain/schema'
import type { EvaluationResult } from '../domain/events'

interface TimerState {
  remainingSec: number
  active: boolean
}

interface RendererState {
  answers: Record<string, AnswerPayload | undefined>
  evaluations: Record<string, EvaluationResult | undefined>
  timers: Record<string, TimerState | undefined>
  setAnswer: (gameId: string, answer: AnswerPayload | undefined) => void
  setEvaluation: (gameId: string, result: EvaluationResult | undefined) => void
  clearAnswer: (gameId: string) => void
  clearEvaluation: (gameId: string) => void
  initTimer: (gameId: string, timeLimitSec: number) => void
  tickTimer: (gameId: string) => number | undefined
  stopTimer: (gameId: string) => void
  resetGame: (gameId: string) => void
}

export const useRendererStore = create<RendererState>((set, get) => ({
  answers: {},
  evaluations: {},
  timers: {},
  setAnswer: (gameId, answer) =>
    set((state) => ({
      answers: { ...state.answers, [gameId]: answer },
    })),
  setEvaluation: (gameId, result) =>
    set((state) => ({
      evaluations: { ...state.evaluations, [gameId]: result },
    })),
  clearAnswer: (gameId) =>
    set((state) => {
      const { [gameId]: _removed, ...rest } = state.answers
      return { answers: rest }
    }),
  clearEvaluation: (gameId) =>
    set((state) => {
      const { [gameId]: _removed, ...rest } = state.evaluations
      return { evaluations: rest }
    }),
  initTimer: (gameId, timeLimitSec) => {
    if (timeLimitSec <= 0) return
    set((state) => ({
      timers: {
        ...state.timers,
        [gameId]: { remainingSec: timeLimitSec, active: true },
      },
    }))
  },
  tickTimer: (gameId) => {
    const timer = get().timers[gameId]
    if (!timer || !timer.active) return undefined
    const next = Math.max(0, timer.remainingSec - 1)
    set((state) => ({
      timers: {
        ...state.timers,
        [gameId]: { remainingSec: next, active: next > 0 },
      },
    }))
    return next
  },
  stopTimer: (gameId) =>
    set((state) => {
      const timer = state.timers[gameId]
      if (!timer) return state
      return {
        timers: {
          ...state.timers,
          [gameId]: { ...timer, active: false },
        },
      }
    }),
  resetGame: (gameId) =>
    set((state) => {
      const { [gameId]: _a, ...answers } = state.answers
      const { [gameId]: _e, ...evaluations } = state.evaluations
      const { [gameId]: _t, ...timers } = state.timers
      return { answers, evaluations, timers }
    }),
}))
