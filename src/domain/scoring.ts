import type { EvaluationResult } from './events'
import type {
  AnswerPayload,
  GameSpec,
  MCQAnswer,
  MCQSpec,
  OrderingAnswer,
  OrderingSpec,
  PairMatchAnswer,
  PairMatchSpec,
} from './schema'

export function canScoreLocally(type: GameSpec['type']): boolean {
  return type === 'mcq' || type === 'ordering' || type === 'pair-match'
}

export function scoreGame(spec: GameSpec, answer: AnswerPayload): EvaluationResult | null {
  if (spec.type !== answer.type) {
    return null
  }

  switch (spec.type) {
    case 'mcq': {
      const payload = answer.payload as MCQAnswer
      return scoreMcq(spec, payload)
    }
    case 'ordering': {
      const payload = answer.payload as OrderingAnswer
      return scoreOrdering(spec, payload)
    }
    case 'pair-match': {
      const payload = answer.payload as PairMatchAnswer
      return scorePairMatch(spec, payload)
    }
    default:
      return null
  }
}

function scoreMcq(spec: MCQSpec, answer: MCQAnswer): EvaluationResult {
  const correct = answer.optionId === spec.correctOptionId
  return {
    gameId: spec.id,
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? 'Correct!' : spec.explanation ?? 'Not quite. Review the concept and try again.',
  }
}

function scoreOrdering(spec: OrderingSpec, answer: OrderingAnswer): EvaluationResult {
  const expected = spec.items
  const submitted = answer.order
  const correct = arraysMatch(expected, submitted)
  return {
    gameId: spec.id,
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? 'Perfect order!' : 'That order is off. Adjust and retry.',
  }
}

function scorePairMatch(spec: PairMatchSpec, answer: PairMatchAnswer): EvaluationResult {
  const expectedMap = new Map(spec.pairs.map((pair) => [pair.left, pair.right]))
  const submittedMap = new Map(answer.matches.map((match) => [match.left, match.right]))

  if (expectedMap.size !== submittedMap.size) {
    return {
      gameId: spec.id,
      correct: false,
      score: 0,
      feedback: 'Keep practicing those matches!',
    }
  }

  const correct = [...expectedMap.entries()].every(([left, right]) => submittedMap.get(left) === right)

  return {
    gameId: spec.id,
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? 'Great job matching the pairs!' : 'Some matches are incorrect. Try again.',
  }
}

function arraysMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}
