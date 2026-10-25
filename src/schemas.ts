import { z } from 'zod';

export const createRoomBody = z.object({
  title: z.string().trim().min(1).max(80),
});

export const questionInput = z
  .object({
    text: z.string().trim().min(1).max(200),
    options: z.array(z.string().trim().min(1).max(100)).min(2).max(4),
    correctIndex: z.number().int().min(0),
    timeLimitSec: z.number().int().min(5).max(60).default(20),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: 'correctIndex must point to an existing option',
    path: ['correctIndex'],
  });

  

export const addQuestionsBody = z.object({
  questions: z.array(questionInput).min(1).max(20),
});

export const joinBody = z.object({
  nickname: z.string().trim().min(2).max(20),
});

export const codeParams = z.object({
  code: z.string().trim().toUpperCase().length(6),
});

export type QuestionInput = z.infer<typeof questionInput>;