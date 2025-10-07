import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnswerPayload } from '../domain/schema'
import type { EvaluationResult, OMIEvidence, OMIMasteryLevel } from '../domain/events'

interface TimerState {
  remainingSec: number
  active: boolean
}

interface OMIProgress {
  omiId: string
  masteryLevel: OMIMasteryLevel
  totalAttempts: number
  successfulAttempts: number
  averageAccuracy: number
  lastAttempt: string
  evidenceHistory: OMIEvidence[]
}

interface AskedQuestion {
  specPath: string
  questionId: string
  timestamp: string
}

interface SubmittedQuestion {
  gameId: string
  questionId: string
  correct: boolean
  timestamp: string
}

interface RendererState {
  answers: Record<string, AnswerPayload | undefined>
  evaluations: Record<string, EvaluationResult | undefined>
  timers: Record<string, TimerState | undefined>
  omiProgress: Record<string, OMIProgress> // keyed by omiId
  askedQuestions: AskedQuestion[] // Track all asked questions
  submittedQuestions: SubmittedQuestion[] // Track all submitted questions
  setAnswer: (gameId: string, answer: AnswerPayload | undefined) => void
  setEvaluation: (gameId: string, result: EvaluationResult | undefined) => void
  clearAnswer: (gameId: string) => void
  clearEvaluation: (gameId: string) => void
  initTimer: (gameId: string, timeLimitSec: number) => void
  tickTimer: (gameId: string) => number | undefined
  stopTimer: (gameId: string) => void
  resetGame: (gameId: string) => void
  recordOMIEvidence: (evidence: OMIEvidence[]) => void
  getOMIMastery: (omiId: string) => OMIMasteryLevel
  markQuestionAsked: (specPath: string, questionId: string) => void
  isQuestionAsked: (specPath: string, questionId: string) => boolean
  resetAskedQuestions: () => void
  markQuestionSubmitted: (gameId: string, questionId: string, correct: boolean) => void
  getSubmittedQuestionsForGame: (gameId: string) => SubmittedQuestion[]
  resetAllProgress: () => void
}

function calculateMasteryLevel(progress: OMIProgress): OMIMasteryLevel {
  if (progress.totalAttempts === 0) return 'not-yet'
  
  const successRate = progress.successfulAttempts / progress.totalAttempts
  const avgAccuracy = progress.averageAccuracy
  
  // Mastery criteria
  if (successRate >= 0.9 && avgAccuracy >= 0.9 && progress.totalAttempts >= 3) {
    return 'mastered'
  } else if (successRate >= 0.7 && avgAccuracy >= 0.7 && progress.totalAttempts >= 2) {
    return 'proficient'
  } else if (successRate >= 0.4 || progress.totalAttempts >= 1) {
    return 'emerging'
  }
  
  return 'not-yet'
}

export const useRendererStore = create<RendererState>()(
  persist(
    (set, get) => ({
      answers: {},
      evaluations: {},
      timers: {},
      omiProgress: {},
      askedQuestions: [],
      submittedQuestions: [],
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
      recordOMIEvidence: (evidenceList) =>
        set((state) => {
          const newProgress = { ...state.omiProgress }
          
          evidenceList.forEach((evidence) => {
            const existing = newProgress[evidence.omiId] || {
              omiId: evidence.omiId,
              masteryLevel: 'not-yet' as OMIMasteryLevel,
              totalAttempts: 0,
              successfulAttempts: 0,
              averageAccuracy: 0,
              lastAttempt: evidence.timestamp,
              evidenceHistory: [],
            }
            
            // Update statistics
            const newTotalAttempts = existing.totalAttempts + 1
            const newSuccessfulAttempts = existing.successfulAttempts + (evidence.demonstrated ? 1 : 0)
            const newAverageAccuracy = 
              (existing.averageAccuracy * existing.totalAttempts + evidence.accuracy) / newTotalAttempts
            
            const updated: OMIProgress = {
              ...existing,
              totalAttempts: newTotalAttempts,
              successfulAttempts: newSuccessfulAttempts,
              averageAccuracy: newAverageAccuracy,
              lastAttempt: evidence.timestamp,
              evidenceHistory: [...existing.evidenceHistory.slice(-9), evidence], // Keep last 10
            }
            
            updated.masteryLevel = calculateMasteryLevel(updated)
            newProgress[evidence.omiId] = updated
          })
          
          return { omiProgress: newProgress }
        }),
      getOMIMastery: (omiId) => {
        const progress = get().omiProgress[omiId]
        return progress?.masteryLevel || 'not-yet'
      },
      markQuestionAsked: (specPath, questionId) =>
        set((state) => ({
          askedQuestions: [
            ...state.askedQuestions,
            { specPath, questionId, timestamp: new Date().toISOString() },
          ],
        })),
      isQuestionAsked: (specPath, questionId) => {
        const asked = get().askedQuestions
        return asked.some((q) => q.specPath === specPath && q.questionId === questionId)
      },
      resetAskedQuestions: () =>
        set({ askedQuestions: [] }),
      markQuestionSubmitted: (gameId, questionId, correct) =>
        set((state) => {
          const existingIndex = state.submittedQuestions.findIndex(
            (entry) => entry.gameId === gameId && entry.questionId === questionId,
          )

          const submission = { gameId, questionId, correct, timestamp: new Date().toISOString() }

          if (existingIndex >= 0) {
            const next = [...state.submittedQuestions]
            next[existingIndex] = submission
            return { submittedQuestions: next }
          }

          return {
            submittedQuestions: [...state.submittedQuestions, submission],
          }
        }),
      getSubmittedQuestionsForGame: (gameId) => {
        return get().submittedQuestions.filter((q) => q.gameId === gameId)
      },
      resetAllProgress: () =>
        set({ 
          omiProgress: {}, 
          askedQuestions: [],
          submittedQuestions: [],
          answers: {},
          evaluations: {},
          timers: {},
        }),
    }),
    {
      name: 'learning-engine-storage',
      partialize: (state) => ({ 
        omiProgress: state.omiProgress,
        askedQuestions: state.askedQuestions,
        submittedQuestions: state.submittedQuestions,
      }),
    }
  )
)
