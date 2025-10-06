import { z } from 'zod'

export const metadataSchema = z
  .object({
    subject: z.string().optional(),
    tags: z.array(z.string()).optional(),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
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
})

export const orderingSpecSchema = baseGameSpecSchema.extend({
  type: z.literal('ordering'),
  items: z.array(z.string().min(1)).min(2, 'Ordering game needs at least two items'),
  shuffle: z.boolean().optional(),
})

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

export const gameSpecSchema = z.discriminatedUnion('type', [mcqSpecSchema, orderingSpecSchema, pairMatchSpecSchema])

export type BaseGameSpec = z.infer<typeof baseGameSpecSchema>
export type MCQSpec = z.infer<typeof mcqSpecSchema>
export type OrderingSpec = z.infer<typeof orderingSpecSchema>
export type PairMatchSpec = z.infer<typeof pairMatchSpecSchema>
export type GameSpec = z.infer<typeof gameSpecSchema>
export type GameType = GameSpec['type']

export const mcqAnswerSchema = z
  .object({
    optionId: z.string().min(1),
  })
  .strict()

export const orderingAnswerSchema = z
  .object({
    order: z.array(z.string().min(1)).min(1),
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

export const answerPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mcq'), payload: mcqAnswerSchema }),
  z.object({ type: z.literal('ordering'), payload: orderingAnswerSchema }),
  z.object({ type: z.literal('pair-match'), payload: pairMatchAnswerSchema }),
])

export type MCQAnswer = z.infer<typeof mcqAnswerSchema>
export type OrderingAnswer = z.infer<typeof orderingAnswerSchema>
export type PairMatchAnswer = z.infer<typeof pairMatchAnswerSchema>
export type AnswerPayload = z.infer<typeof answerPayloadSchema>
