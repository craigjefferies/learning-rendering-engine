import type { EvaluationResult, OMIEvidence } from './events'
import type {
  AnswerPayload,
  GameSpec,
  MCQAnswer,
  MCQSetAnswer,
  MCQSetSpec,
  MCQSpec,
  OrderingAnswer,
  OrderingSetAnswer,
  OrderingSetSpec,
  OrderingSpec,
  PairMatchAnswer,
  PairMatchSetAnswer,
  PairMatchSetSpec,
  PairMatchSpec,
  FillInTheBlanksAnswer,
  FillInTheBlanksSpec,
  FillInTheBlanksSetAnswer,
  FillInTheBlanksSetSpec,
  ActivitySetAnswer,
  ActivitySetSpec,
  ClassificationSetAnswer,
  ClassificationSetSpec,
} from './schema'

export function canScoreLocally(type: GameSpec['type']): boolean {
  return (
    type === 'mcq' ||
    type === 'mcq-set' ||
    type === 'ordering' ||
    type === 'ordering-set' ||
    type === 'pair-match' ||
    type === 'pair-match-set' ||
    type === 'fill-in-the-blanks' ||
    type === 'fill-in-the-blanks-set' ||
    type === 'activity-set' ||
    type === 'classification-set'
  )
}

function generateOMIEvidence(spec: GameSpec, correct: boolean, accuracy: number): OMIEvidence[] {
  if (!spec.metadata?.omis || spec.metadata.omis.length === 0) {
    return []
  }

  return spec.metadata.omis.map((omiId) => ({
    omiId,
    demonstrated: correct,
    accuracy,
    timestamp: new Date().toISOString(),
  }))
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
    case 'mcq-set': {
      const payload = answer.payload as MCQSetAnswer
      return scoreMcqSet(spec, payload)
    }
    case 'ordering': {
      const payload = answer.payload as OrderingAnswer
      return scoreOrdering(spec, payload)
    }
    case 'ordering-set': {
      const payload = answer.payload as OrderingSetAnswer
      return scoreOrderingSet(spec, payload)
    }
    case 'pair-match': {
      const payload = answer.payload as PairMatchAnswer
      return scorePairMatch(spec, payload)
    }
    case 'pair-match-set': {
      const payload = answer.payload as PairMatchSetAnswer
      return scorePairMatchSet(spec, payload)
    }
    case 'fill-in-the-blanks': {
      const payload = answer.payload as FillInTheBlanksAnswer
      return scoreFillInTheBlanks(spec, payload)
    }
    case 'fill-in-the-blanks-set': {
      const payload = answer.payload as FillInTheBlanksSetAnswer
      return scoreFillInTheBlanksSet(spec as FillInTheBlanksSetSpec, payload)
    }
    case 'activity-set': {
      const payload = answer.payload as ActivitySetAnswer
      return scoreActivitySet(spec, payload)
    }
    case 'classification-set': {
      const payload = answer.payload as ClassificationSetAnswer
      return scoreClassificationSet(spec, payload)
    }
    default:
      return null
  }
}

function scoreMcq(spec: MCQSpec, answer: MCQAnswer): EvaluationResult {
  const correct = answer.optionId === spec.correctOptionId
  const accuracy = correct ? 1 : 0
  const omiEvidence = generateOMIEvidence(spec, correct, accuracy)
  
  return {
    gameId: spec.id,
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? 'Correct!' : spec.explanation ?? 'Not quite. Review the concept and try again.',
    omiEvidence,
  }
}

function scoreMcqSet(spec: MCQSetSpec, answer: MCQSetAnswer): EvaluationResult {
  const questionResults: Array<{ correct: boolean; omiIds: string[] }> = []
  let totalCorrect = 0
  
  // Score each question
  for (const question of spec.questions) {
    const selectedOptionId = answer.answers[question.id]
    const correct = selectedOptionId === question.correctOptionId
    if (correct) totalCorrect++
    
    // Get OMI IDs for this question
    const omiIds = question.omiMapping || []
    questionResults.push({ correct, omiIds })
  }
  
  // Aggregate OMI evidence across all questions
  const omiEvidenceMap = new Map<string, { correct: number; total: number }>()
  
  for (const result of questionResults) {
    for (const omiId of result.omiIds) {
      const existing = omiEvidenceMap.get(omiId) || { correct: 0, total: 0 }
      existing.total++
      if (result.correct) existing.correct++
      omiEvidenceMap.set(omiId, existing)
    }
  }
  
  // Generate OMI evidence with aggregated accuracy
  const omiEvidence: OMIEvidence[] = Array.from(omiEvidenceMap.entries()).map(
    ([omiId, stats]) => ({
      omiId,
      demonstrated: stats.correct === stats.total,
      accuracy: stats.correct / stats.total,
      timestamp: new Date().toISOString(),
    })
  )
  
  const allCorrect = totalCorrect === spec.questions.length
  const score = totalCorrect / spec.questions.length
  
  return {
    gameId: spec.id,
    correct: allCorrect,
    score,
    feedback: allCorrect 
      ? `Perfect! You got all ${spec.questions.length} questions correct!`
      : `You got ${totalCorrect} out of ${spec.questions.length} questions correct.`,
    omiEvidence,
  }
}

function scoreOrdering(spec: OrderingSpec, answer: OrderingAnswer): EvaluationResult {
  const expected = spec.items
  const submitted = answer.order
  const correct = arraysMatch(expected, submitted)
  
  // Calculate partial accuracy for ordering
  let correctPositions = 0
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] === submitted[i]) {
      correctPositions++
    }
  }
  const accuracy = correctPositions / expected.length
  const omiEvidence = generateOMIEvidence(spec, correct, accuracy)
  
  return {
    gameId: spec.id,
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? 'Perfect order!' : 'That order is off. Adjust and retry.',
    omiEvidence,
  }
}

function scoreOrderingSet(spec: OrderingSetSpec, answer: OrderingSetAnswer): EvaluationResult {
  const questionResults: Array<{ correct: boolean; accuracy: number; omiIds: string[] }> = []
  let totalCorrect = 0
  
  // Score each question
  for (const question of spec.questions) {
    const submittedOrder = answer.answers[question.id] || []
    const expected = question.items
    const correct = arraysMatch(expected, submittedOrder)
    
    // Calculate partial accuracy for ordering
    let correctPositions = 0
    for (let i = 0; i < expected.length; i++) {
      if (expected[i] === submittedOrder[i]) {
        correctPositions++
      }
    }
    const accuracy = expected.length > 0 ? correctPositions / expected.length : 0
    if (correct) totalCorrect++
    
    // Get OMI IDs for this question
    const omiIds = question.omiMapping || []
    questionResults.push({ correct, accuracy, omiIds })
  }
  
  // Aggregate OMI evidence across all questions
  const omiEvidenceMap = new Map<string, { correct: number; total: number; totalAccuracy: number }>()
  
  for (const result of questionResults) {
    for (const omiId of result.omiIds) {
      const existing = omiEvidenceMap.get(omiId) || { correct: 0, total: 0, totalAccuracy: 0 }
      existing.total++
      existing.totalAccuracy += result.accuracy
      if (result.correct) existing.correct++
      omiEvidenceMap.set(omiId, existing)
    }
  }
  
  // Generate OMI evidence with aggregated accuracy
  const omiEvidence: OMIEvidence[] = Array.from(omiEvidenceMap.entries()).map(
    ([omiId, stats]) => ({
      omiId,
      demonstrated: stats.correct === stats.total,
      accuracy: stats.totalAccuracy / stats.total,
      timestamp: new Date().toISOString(),
    })
  )
  
  const allCorrect = totalCorrect === spec.questions.length
  const score = totalCorrect / spec.questions.length
  
  return {
    gameId: spec.id,
    correct: allCorrect,
    score,
    feedback: allCorrect 
      ? `Perfect! You got all ${spec.questions.length} ordering questions correct!`
      : `You got ${totalCorrect} out of ${spec.questions.length} questions correct.`,
    omiEvidence,
  }
}

function scorePairMatch(spec: PairMatchSpec, answer: PairMatchAnswer): EvaluationResult {
  const expectedMap = new Map(spec.pairs.map((pair) => [pair.left, pair.right]))
  const submittedMap = new Map(answer.matches.map((match) => [match.left, match.right]))

  if (expectedMap.size !== submittedMap.size) {
    const omiEvidence = generateOMIEvidence(spec, false, 0)
    return {
      gameId: spec.id,
      correct: false,
      score: 0,
      feedback: 'Keep practicing those matches!',
      omiEvidence,
    }
  }

  let correctMatches = 0
  expectedMap.forEach((right, left) => {
    if (submittedMap.get(left) === right) {
      correctMatches++
    }
  })
  
  const accuracy = correctMatches / expectedMap.size
  const correct = correctMatches === expectedMap.size
  const omiEvidence = generateOMIEvidence(spec, correct, accuracy)

  return {
    gameId: spec.id,
    correct,
    score: correct ? 1 : 0,
    feedback: correct ? 'Great job matching the pairs!' : 'Some matches are incorrect. Try again.',
    omiEvidence,
  }
}

function scorePairMatchSet(spec: PairMatchSetSpec, answer: PairMatchSetAnswer): EvaluationResult {
  const questionResults: Array<{ correct: boolean; accuracy: number; omiIds: string[] }> = []
  let totalCorrect = 0
  
  // Score each question
  for (const question of spec.questions) {
    const submittedMatches = answer.answers[question.id] || []
    const expectedMap = new Map(question.pairs.map((pair) => [pair.left, pair.right]))
    const submittedMap = new Map(submittedMatches.map((match) => [match.left, match.right]))
    
    let correctMatches = 0
    expectedMap.forEach((right, left) => {
      if (submittedMap.get(left) === right) {
        correctMatches++
      }
    })
    
    const accuracy = expectedMap.size > 0 ? correctMatches / expectedMap.size : 0
    const correct = correctMatches === expectedMap.size && submittedMap.size === expectedMap.size
    if (correct) totalCorrect++
    
    // Get OMI IDs for this question
    const omiIds = question.omiMapping || []
    questionResults.push({ correct, accuracy, omiIds })
  }
  
  // Aggregate OMI evidence across all questions
  const omiEvidenceMap = new Map<string, { correct: number; total: number; totalAccuracy: number }>()
  
  for (const result of questionResults) {
    for (const omiId of result.omiIds) {
      const existing = omiEvidenceMap.get(omiId) || { correct: 0, total: 0, totalAccuracy: 0 }
      existing.total++
      existing.totalAccuracy += result.accuracy
      if (result.correct) existing.correct++
      omiEvidenceMap.set(omiId, existing)
    }
  }
  
  // Generate OMI evidence with aggregated accuracy
  const omiEvidence: OMIEvidence[] = Array.from(omiEvidenceMap.entries()).map(
    ([omiId, stats]) => ({
      omiId,
      demonstrated: stats.correct === stats.total,
      accuracy: stats.totalAccuracy / stats.total,
      timestamp: new Date().toISOString(),
    })
  )
  
  const allCorrect = totalCorrect === spec.questions.length
  const score = totalCorrect / spec.questions.length
  
  return {
    gameId: spec.id,
    correct: allCorrect,
    score,
    feedback: allCorrect 
      ? `Perfect! You got all ${spec.questions.length} pair-matching questions correct!`
      : `You got ${totalCorrect} out of ${spec.questions.length} questions correct.`,
    omiEvidence,
  }
}

function arraysMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

function scoreFillInTheBlanks(spec: FillInTheBlanksSpec, answer: FillInTheBlanksAnswer): EvaluationResult {
  let correctAnswers = 0
  
  for (const sentence of spec.sentences) {
    const userAnswer = answer.answers[sentence.id]
    if (userAnswer === sentence.blank_answer) {
      correctAnswers++
    }
  }
  
  const accuracy = correctAnswers / spec.sentences.length
  const correct = correctAnswers === spec.sentences.length
  const omiEvidence = generateOMIEvidence(spec, correct, accuracy)
  
  return {
    gameId: spec.id,
    correct,
    score: accuracy,
    feedback: correct
      ? 'Perfect! All blanks filled correctly!'
      : `You got ${correctAnswers} out of ${spec.sentences.length} blanks correct.`,
    omiEvidence,
  }
}

function scoreFillInTheBlanksSet(
  spec: FillInTheBlanksSetSpec,
  answer: FillInTheBlanksSetAnswer,
): EvaluationResult {
  const questionResults: Array<{ correct: boolean; accuracy: number; omiIds: string[] }> = []
  let totalCorrect = 0

  for (const question of spec.questions) {
    const questionAnswer = answer.answers[question.id] || {}
    const totalSentences = question.sentences.length
    let correctBlanks = 0

    for (const sentence of question.sentences) {
      if (questionAnswer[sentence.id] === sentence.blank_answer) {
        correctBlanks++
      }
    }

    const accuracy = totalSentences > 0 ? correctBlanks / totalSentences : 0
    const correct = accuracy === 1
    if (correct) totalCorrect++

    const omiIds = question.metadata?.omis ?? []
    questionResults.push({ correct, accuracy, omiIds })
  }

  const score = spec.questions.length > 0 ? totalCorrect / spec.questions.length : 0
  const overallCorrect = totalCorrect === spec.questions.length

  const feedback = overallCorrect
    ? 'Outstanding! Every blank across the set is correct.'
    : totalCorrect === 0
      ? 'Keep practising. Review the terms and try again.'
      : 'Great effort. Review the highlighted sentences and try again.'

  const omiEvidenceMap = new Map<string, { correct: number; total: number; totalAccuracy: number }>()

  for (const result of questionResults) {
    for (const omiId of result.omiIds) {
      const existing = omiEvidenceMap.get(omiId) || { correct: 0, total: 0, totalAccuracy: 0 }
      existing.total++
      existing.totalAccuracy += result.accuracy
      if (result.correct) existing.correct++
      omiEvidenceMap.set(omiId, existing)
    }
  }

  const omiEvidence: OMIEvidence[] = Array.from(omiEvidenceMap.entries()).map(([omiId, stats]) => ({
    omiId,
    demonstrated: stats.correct === stats.total,
    accuracy: stats.total > 0 ? stats.totalAccuracy / stats.total : 0,
    timestamp: new Date().toISOString(),
  }))

  return {
    gameId: spec.id,
    correct: overallCorrect,
    score,
    feedback,
    omiEvidence,
  }
}

function scoreActivitySet(spec: ActivitySetSpec, answer: ActivitySetAnswer): EvaluationResult {
  const activityResults: Array<{ correct: boolean; accuracy: number; omiIds: string[] }> = []
  let totalCorrect = 0
  
  for (const activity of spec.activities) {
    const activityAnswer = answer.answers[activity.id]
    if (!activityAnswer) continue
    
    let correct = false
    let accuracy = 0
    
    // Score based on activity type
    switch (activity.type) {
      case 'mcq': {
        const mcqAnswer = activityAnswer as { optionId: string }
        correct = mcqAnswer.optionId === activity.correctOptionId
        accuracy = correct ? 1 : 0
        break
      }
      case 'ordering': {
        const orderingAnswer = activityAnswer as { order: string[] }
        correct = arraysMatch(activity.items, orderingAnswer.order)
        // Calculate partial accuracy
        let correctPositions = 0
        for (let i = 0; i < activity.items.length; i++) {
          if (activity.items[i] === orderingAnswer.order[i]) {
            correctPositions++
          }
        }
        accuracy = correctPositions / activity.items.length
        break
      }
      case 'pair-match': {
        const pairMatchAnswer = activityAnswer as { matches: Array<{ left: string; right: string }> }
        const expectedMap = new Map(activity.pairs.map((pair) => [pair.left, pair.right]))
        const submittedMap = new Map(pairMatchAnswer.matches.map((match) => [match.left, match.right]))
        
        let correctMatches = 0
        expectedMap.forEach((right, left) => {
          if (submittedMap.get(left) === right) {
            correctMatches++
          }
        })
        
        accuracy = expectedMap.size > 0 ? correctMatches / expectedMap.size : 0
        correct = correctMatches === expectedMap.size && submittedMap.size === expectedMap.size
        break
      }
      case 'fill-in-the-blanks': {
        const fillAnswer = activityAnswer as { answers: Record<string, string> }
        let correctBlanks = 0
        for (const sentence of activity.sentences) {
          if (fillAnswer.answers[sentence.id] === sentence.blank_answer) {
            correctBlanks++
          }
        }
        accuracy = correctBlanks / activity.sentences.length
        correct = correctBlanks === activity.sentences.length
        break
      }
    }
    
    if (correct) totalCorrect++
    
    const omiIds = activity.omiMapping || []
    activityResults.push({ correct, accuracy, omiIds })
  }
  
  // Aggregate OMI evidence across all activities
  const omiEvidenceMap = new Map<string, { correct: number; total: number; totalAccuracy: number }>()
  
  for (const result of activityResults) {
    for (const omiId of result.omiIds) {
      const existing = omiEvidenceMap.get(omiId) || { correct: 0, total: 0, totalAccuracy: 0 }
      existing.total++
      existing.totalAccuracy += result.accuracy
      if (result.correct) existing.correct++
      omiEvidenceMap.set(omiId, existing)
    }
  }
  
  // Generate OMI evidence with aggregated accuracy
  const omiEvidence: OMIEvidence[] = Array.from(omiEvidenceMap.entries()).map(
    ([omiId, stats]) => ({
      omiId,
      demonstrated: stats.correct === stats.total,
      accuracy: stats.totalAccuracy / stats.total,
      timestamp: new Date().toISOString(),
    })
  )
  
  const allCorrect = totalCorrect === spec.activities.length
  const score = totalCorrect / spec.activities.length
  
  return {
    gameId: spec.id,
    correct: allCorrect,
    score,
    feedback: allCorrect
      ? `Perfect! You completed all ${spec.activities.length} activities correctly!`
      : `You completed ${totalCorrect} out of ${spec.activities.length} activities correctly.`,
    omiEvidence,
  }
}

function scoreClassificationSet(spec: ClassificationSetSpec, answer: ClassificationSetAnswer): EvaluationResult {
  const activityResults: Array<{ correct: boolean; accuracy: number; omiIds: string[] }> = []
  let totalCorrect = 0
  
  // Score each question
  for (const question of spec.questions) {
    const questionAnswers = answer.answers[question.id] || {}
    
    let correctClassifications = 0
    for (const item of question.items) {
      const assignedCategoryId = questionAnswers[item.id]
      if (assignedCategoryId === item.correctCategoryId) {
        correctClassifications++
      }
    }
    
    const accuracy = question.items.length > 0 ? correctClassifications / question.items.length : 0
    const correct = correctClassifications === question.items.length
    if (correct) totalCorrect++
    
    // Get OMI IDs for this question
    const omiIds = question.omiMapping || []
    activityResults.push({ correct, accuracy, omiIds })
  }
  
  // Aggregate OMI evidence across all activities
  const omiEvidenceMap = new Map<string, { correct: number; total: number; totalAccuracy: number }>()
  
  for (const result of activityResults) {
    for (const omiId of result.omiIds) {
      const existing = omiEvidenceMap.get(omiId) || { correct: 0, total: 0, totalAccuracy: 0 }
      existing.total++
      existing.totalAccuracy += result.accuracy
      if (result.correct) existing.correct++
      omiEvidenceMap.set(omiId, existing)
    }
  }
  
  // Generate OMI evidence with aggregated accuracy
  const omiEvidence: OMIEvidence[] = Array.from(omiEvidenceMap.entries()).map(
    ([omiId, stats]) => ({
      omiId,
      demonstrated: stats.correct === stats.total,
      accuracy: stats.totalAccuracy / stats.total,
      timestamp: new Date().toISOString(),
    })
  )
  
  const allCorrect = totalCorrect === spec.questions.length
  const score = spec.questions.length > 0 ? totalCorrect / spec.questions.length : 0
  
  return {
    gameId: spec.id,
    correct: allCorrect,
    score,
    feedback: allCorrect 
      ? `Perfect! You correctly classified all items in ${spec.questions.length} ${spec.questions.length === 1 ? 'question' : 'questions'}!`
      : `You got ${totalCorrect} out of ${spec.questions.length} ${spec.questions.length === 1 ? 'question' : 'questions'} completely correct.`,
    omiEvidence,
  }
}
