import { z } from 'zod'

export const metadataSchema = z
  .object({
    subject: z.string().optional(),
    tags: z.array(z.string()).optional(),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    omis: z.array(z.string()).optional(), // Observable Micro-Indicators
    assessmentStandard: z.string().optional(), // e.g., "AS92005"
    level: z.string().optional(), // e.g., "NCEA Level 2"
  })
  .strict()

const baseGameSpecSchema = z
  .object({
    id: z.string().min(1, 'Game spec requires an id'),
    type: z.enum(['mcq', 'ordering', 'pair-match']),
    title: z.string().optional(),
    prompt: z.string().optional(),
    instructions: z.string().optional(),
    timeLimitSec: z.number().int().positive().optional(),
    metadata: metadataSchema.optional(),
  })
  .strict()

export const mcqSpecSchema = baseGameSpecSchema.extend({
  type: z.literal('mcq'),
  options: z
    .array(
      z
        .object({
          id: z.string().min(1),
          text: z.string().min(1),
        })
        .strict(),
    )
    .min(2, 'MCQ must provide at least two options'),
  correctOptionId: z.string().min(1),
  explanation: z.string().optional(),
  omiMapping: z.array(z.string()).optional(), // Specific OMIs for this question
})

// Individual MCQ question for use in sets
const mcqQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('mcq'),
  title: z.string().optional(),
  prompt: z.string().optional(),
  options: z
    .array(
      z
        .object({
          id: z.string().min(1),
          text: z.string().min(1),
        })
        .strict(),
    )
    .min(2),
  correctOptionId: z.string().min(1),
  explanation: z.string().optional(),
  omiMapping: z.array(z.string()).optional(),
})

// MCQ Set - collection of multiple MCQ questions
export const mcqSetSpecSchema = z
  .object({
    id: z.string().min(1, 'Question set requires an id'),
    type: z.literal('mcq-set'),
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: metadataSchema.optional(),
    questions: z.array(mcqQuestionSchema).min(1, 'Question set must have at least one question'),
  })
  .strict()

export const orderingSpecSchema = baseGameSpecSchema.extend({
  type: z.literal('ordering'),
  items: z.array(z.string().min(1)).min(2, 'Ordering game needs at least two items'),
  shuffle: z.boolean().optional(),
})

// Individual ordering question for use in sets
const orderingQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('ordering'),
  title: z.string().optional(),
  prompt: z.string().optional(),
  items: z.array(z.string().min(1)).min(2, 'Ordering game needs at least two items'),
  shuffle: z.boolean().optional(),
  omiMapping: z.array(z.string()).optional(),
})

export const orderingSetSpecSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('ordering-set'),
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: metadataSchema.optional(),
    questions: z
      .array(orderingQuestionSchema)
      .min(1, 'Question set must have at least one question'),
  })
  .strict()

export const pairMatchSpecSchema = baseGameSpecSchema.extend({
  type: z.literal('pair-match'),
  pairs: z
    .array(
      z
        .object({
          left: z.string().min(1),
          right: z.string().min(1),
        })
        .strict(),
    )
    .min(1, 'Pair match requires at least one pair'),
  distractorsRight: z.array(z.string().min(1)).optional(),
})

// Individual pair-match question for use in sets
const pairMatchQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('pair-match'),
  title: z.string().optional(),
  pairs: z
    .array(
      z
        .object({
          left: z.string().min(1),
          right: z.string().min(1),
        })
        .strict(),
    )
    .min(1, 'Pair match requires at least one pair'),
  distractorsRight: z.array(z.string().min(1)).optional(),
  omiMapping: z.array(z.string()).optional(),
})

export const pairMatchSetSpecSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('pair-match-set'),
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: metadataSchema.optional(),
    questions: z
      .array(pairMatchQuestionSchema)
      .min(1, 'Question set must have at least one question'),
  })
  .strict()

// Fill-in-the-blanks game
const sentenceSchema = z.object({
  id: z.string().min(1),
  text: z.array(z.string()), // Array of text segments with blank positions
  blank_answer: z.string().min(1), // The correct answer for the blank
})

export const fillInTheBlanksSpecSchema = baseGameSpecSchema.extend({
  type: z.literal('fill-in-the-blanks'),
  sentences: z.array(sentenceSchema).min(1, 'At least one sentence required'),
  word_bank: z.array(z.string().min(1)).min(1, 'Word bank must have at least one word'),
  omiMapping: z.array(z.string()).optional(), // Specific OMIs for this question
})

export const fillInTheBlanksSetSpecSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('fill-in-the-blanks-set'),
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: metadataSchema.optional(),
    questions: z
      .array(fillInTheBlanksSpecSchema)
      .min(1, 'Fill in the blanks set must have at least one question'),
  })
  .strict()

// Classification game
const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
})

const classificationItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  correctCategoryId: z.string().min(1),
})

const classificationQuestionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('classification'),
  title: z.string().optional(),
  prompt: z.string().optional(),
  categories: z.array(categorySchema).min(2, 'Classification needs at least two categories'),
  items: z.array(classificationItemSchema).min(1, 'Classification needs at least one item'),
  omiMapping: z.array(z.string()).optional(),
})

export const classificationSetSpecSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('classification-set'),
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: metadataSchema.optional(),
    questions: z
      .array(classificationQuestionSchema)
      .min(1, 'Classification set must have at least one question'),
  })
  .strict()

// Showdown set: comparative reasoning prompts
const showdownContextSchema = z
  .object({
    interfaceA: z
      .object({
        summary: z.string().min(1),
        details: z.array(z.string().min(1)).min(1),
      })
      .strict(),
    interfaceB: z
      .object({
        summary: z.string().min(1),
        details: z.array(z.string().min(1)).min(1),
      })
      .strict(),
  })
  .strict()

const showdownOptionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string().min(1),
  })
  .strict()

const showdownReasonSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    correct: z.boolean(),
  })
  .strict()

const showdownImprovementSchema = z
  .object({
    prompt: z.string().min(1),
    options: z
      .array(
        z
          .object({
            id: z.string().min(1),
            label: z.string().min(1),
            correct: z.boolean(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()

const showdownSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    prompt: z.string().min(1),
    context: showdownContextSchema,
    options: z.array(showdownOptionSchema).min(2),
    correctOptionId: z.string().min(1),
    reasonOptions: z.array(showdownReasonSchema).min(2),
    improvementQuestion: showdownImprovementSchema.optional(),
    omiMapping: z.array(z.string()).optional(),
  })
  .strict()

export const showdownSetSpecSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('showdown-set'),
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: metadataSchema.optional(),
    showdowns: z.array(showdownSchema).min(1, 'Showdown set must have at least one showdown'),
  })
  .strict()

// Activity-set: Mixed game types in one collection
const activitySchema = z.discriminatedUnion('type', [
  mcqQuestionSchema,
  orderingQuestionSchema,
  pairMatchQuestionSchema,
  fillInTheBlanksSpecSchema,
])

export const activitySetSpecSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal('activity-set'),
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: metadataSchema.optional(),
    activities: z
      .array(activitySchema)
      .min(1, 'Activity set must have at least one activity'),
  })
  .strict()

export const gameSpecSchema = z.discriminatedUnion('type', [
  mcqSpecSchema, 
  orderingSpecSchema, 
  pairMatchSpecSchema,
  fillInTheBlanksSpecSchema,
  fillInTheBlanksSetSpecSchema,
  mcqSetSpecSchema,
  orderingSetSpecSchema,
  pairMatchSetSpecSchema,
  activitySetSpecSchema,
  classificationSetSpecSchema,
  showdownSetSpecSchema,
])

export type BaseGameSpec = z.infer<typeof baseGameSpecSchema>
export type MCQSpec = z.infer<typeof mcqSpecSchema>
export type OrderingSpec = z.infer<typeof orderingSpecSchema>
export type PairMatchSpec = z.infer<typeof pairMatchSpecSchema>
export type FillInTheBlanksSpec = z.infer<typeof fillInTheBlanksSpecSchema>
export type FillInTheBlanksSetSpec = z.infer<typeof fillInTheBlanksSetSpecSchema>
export type MCQSetSpec = z.infer<typeof mcqSetSpecSchema>
export type OrderingSetSpec = z.infer<typeof orderingSetSpecSchema>
export type PairMatchSetSpec = z.infer<typeof pairMatchSetSpecSchema>
export type ActivitySetSpec = z.infer<typeof activitySetSpecSchema>
export type ClassificationSetSpec = z.infer<typeof classificationSetSpecSchema>
export type ShowdownSetSpec = z.infer<typeof showdownSetSpecSchema>
export type GameSpec = z.infer<typeof gameSpecSchema>
export type GameType = GameSpec['type']

export const mcqAnswerSchema = z
  .object({
    optionId: z.string().min(1),
  })
  .strict()

export const mcqSetAnswerSchema = z
  .object({
    answers: z.record(z.string(), z.string()), // Record<questionId, optionId>
  })
  .strict()

export const orderingAnswerSchema = z
  .object({
    order: z.array(z.string().min(1)).min(1),
  })
  .strict()

export const orderingSetAnswerSchema = z
  .object({
    answers: z.record(
      z.string(), 
      z.array(z.string().min(1))
    ), // Record<questionId, order[]>
  })
  .strict()

export const pairMatchAnswerSchema = z
  .object({
    matches: z
      .array(
        z
          .object({
            left: z.string().min(1),
            right: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()

export const pairMatchSetAnswerSchema = z
  .object({
    answers: z.record(
      z.string(), 
      z.array(
        z.object({
          left: z.string().min(1),
          right: z.string().min(1),
        }).strict()
      )
    ), // Record<questionId, matches[]>
  })
  .strict()

export const fillInTheBlanksAnswerSchema = z
  .object({
    answers: z.record(z.string(), z.string()), // Record<sentenceId, selectedWord>
  })
  .strict()

export const fillInTheBlanksSetAnswerSchema = z
  .object({
    answers: z.record(
      z.string(), // questionId
      z.record(z.string(), z.string()), // Record<sentenceId, selectedWord>
    ),
  })
  .strict()

export const showdownSetAnswerSchema = z
  .object({
    answers: z.record(
      z.string(), // showdownId
      z.object({
        optionId: z.string(),
        reasonIds: z.array(z.string().min(1)),
        improvementOptionId: z.string().optional(),
      }).strict(),
    ),
  })
  .strict()

export const activitySetAnswerSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()), // Record<activityId, activitySpecificAnswer>
  })
  .strict()

export const classificationSetAnswerSchema = z
  .object({
    answers: z.record(
      z.string(), // activityId
      z.record(z.string(), z.string()) // Record<itemId, categoryId>
    ),
  })
  .strict()

export const answerPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mcq'), payload: mcqAnswerSchema }),
  z.object({ type: z.literal('mcq-set'), payload: mcqSetAnswerSchema }),
  z.object({ type: z.literal('ordering'), payload: orderingAnswerSchema }),
  z.object({ type: z.literal('ordering-set'), payload: orderingSetAnswerSchema }),
  z.object({ type: z.literal('pair-match'), payload: pairMatchAnswerSchema }),
  z.object({ type: z.literal('pair-match-set'), payload: pairMatchSetAnswerSchema }),
  z.object({ type: z.literal('fill-in-the-blanks'), payload: fillInTheBlanksAnswerSchema }),
  z.object({ type: z.literal('fill-in-the-blanks-set'), payload: fillInTheBlanksSetAnswerSchema }),
  z.object({ type: z.literal('showdown-set'), payload: showdownSetAnswerSchema }),
  z.object({ type: z.literal('activity-set'), payload: activitySetAnswerSchema }),
  z.object({ type: z.literal('classification-set'), payload: classificationSetAnswerSchema }),
])

export type MCQAnswer = z.infer<typeof mcqAnswerSchema>
export type MCQSetAnswer = z.infer<typeof mcqSetAnswerSchema>
export type OrderingAnswer = z.infer<typeof orderingAnswerSchema>
export type OrderingSetAnswer = z.infer<typeof orderingSetAnswerSchema>
export type PairMatchAnswer = z.infer<typeof pairMatchAnswerSchema>
export type PairMatchSetAnswer = z.infer<typeof pairMatchSetAnswerSchema>
export type FillInTheBlanksAnswer = z.infer<typeof fillInTheBlanksAnswerSchema>
export type FillInTheBlanksSetAnswer = z.infer<typeof fillInTheBlanksSetAnswerSchema>
export type ShowdownSetAnswer = z.infer<typeof showdownSetAnswerSchema>
export type ActivitySetAnswer = z.infer<typeof activitySetAnswerSchema>
export type ClassificationSetAnswer = z.infer<typeof classificationSetAnswerSchema>
export type AnswerPayload = z.infer<typeof answerPayloadSchema>
