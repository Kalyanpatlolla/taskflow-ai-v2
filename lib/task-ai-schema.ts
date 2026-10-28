import { z } from "zod";

export const taskSuggestionSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2000),
  priority: z.enum(["low", "medium", "high"]),
});

export const taskSuggestionsSchema = z
  .array(taskSuggestionSchema)
  .min(3)
  .max(8);

export const taskGenerationRequestSchema = z.object({
  goal: z.string().trim().min(10).max(4000),
});

export const acceptedTasksSchema = z
  .array(taskSuggestionSchema)
  .min(1)
  .max(8);
