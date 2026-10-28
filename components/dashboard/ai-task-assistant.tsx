"use client";

import { saveSuggestedTasks } from "@/app/dashboard/projects/[id]/ai-tasks";
import { acceptedTasksSchema, taskSuggestionsSchema } from "@/lib/task-ai-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Check,
  LoaderCircle,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { z } from "zod";

type Suggestion = z.infer<typeof taskSuggestionsSchema>[number];
type PreviewSuggestion = Suggestion & { key: string; accepted: boolean };
const generationResponseSchema = z.object({
  mode: z.literal("gemini"),
  suggestions: taskSuggestionsSchema,
});

export function AiTaskAssistant({
  projectId,
  geminiConfigured,
  rateLimitConfigured,
}: {
  projectId: string;
  geminiConfigured: boolean;
  rateLimitConfigured: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [goal, setGoal] = useState("");
  const [suggestions, setSuggestions] = useState<PreviewSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [error, setError] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const generationLockRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [dialogOpen]);

  function closeDialog() {
    setDialogOpen(false);
  }

  async function generateTasks(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (generationLockRef.current || isSaving) return;
    generationLockRef.current = true;
    setError("");
    setCanRetry(false);
    setNotice("");
    setIsGenerating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/ai-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
        signal: AbortSignal.timeout(32_000),
      });

      let result: unknown;
      try {
        result = await response.json();
      } catch {
        setCanRetry(true);
        throw new Error("Gemini returned an unreadable response. Please retry.");
      }

      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to generate tasks. Please try again.";
        setCanRetry(
          response.status === 429 ||
            response.status === 503 ||
            response.status === 504 ||
            response.status >= 500,
        );
        throw new Error(message);
      }

      const parsed = generationResponseSchema.safeParse(result);
      if (!parsed.success) {
        throw new Error("Gemini returned invalid task suggestions.");
      }
      setSuggestions(
        parsed.data.suggestions.map((suggestion) => ({
          ...suggestion,
          key: crypto.randomUUID(),
          accepted: false,
        })),
      );
    } catch (generationError) {
      const timedOut =
        generationError instanceof DOMException &&
        generationError.name === "TimeoutError";
      if (
        timedOut ||
        generationError instanceof TypeError
      ) {
        setCanRetry(true);
      }
      setError(
        timedOut
          ? "Gemini is taking longer than expected. Please retry."
          : generationError instanceof Error
            ? generationError.message
            : "Unable to generate tasks. Please try again.",
      );
    } finally {
      generationLockRef.current = false;
      setIsGenerating(false);
    }
  }

  function updateSuggestion(
    key: string,
    field: keyof Suggestion,
    value: string,
  ) {
    setSuggestions((current) =>
      current.map((suggestion) =>
        suggestion.key === key ? { ...suggestion, [field]: value } : suggestion,
      ),
    );
  }

  function acceptSuggestions() {
    setError("");
    setNotice("");
    const accepted = suggestions
      .filter((suggestion) => suggestion.accepted)
      .map(({ title, description, priority }) => ({
        title,
        description,
        priority,
      }));
    const parsed = acceptedTasksSchema.safeParse(accepted);
    if (!parsed.success) {
      setError("Accept at least one valid task suggestion before saving.");
      return;
    }

    startSaving(async () => {
      const result = await saveSuggestedTasks(projectId, parsed.data);
      if (result.error) {
        setError(result.error);
        setCanRetry(false);
        return;
      }
      setNotice(`${result.savedCount ?? parsed.data.length} tasks added to the board.`);
      setSuggestions([]);
      setDialogOpen(false);
      router.refresh();
    });
  }

  const canGenerate = geminiConfigured && rateLimitConfigured;

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50/70 p-5 shadow-sm shadow-violet-100/50 dark:border-violet-900/60 dark:from-violet-950/60 dark:via-slate-900 dark:to-blue-950/30 dark:shadow-black/10 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-20 size-48 rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-500/10" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 text-white shadow-md shadow-violet-500/20">
              <Sparkles aria-hidden="true" size={19} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                AI Task Assistant
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Generate subtasks with Gemini, then review each suggestion
                before saving.
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  canGenerate
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {canGenerate
                  ? "Gemini generation enabled"
                  : !geminiConfigured
                    ? "Gemini unavailable - GEMINI_API_KEY required"
                    : "Rate limiting unavailable - Upstash configuration required"}
              </span>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
              setDialogOpen(true);
            }}
            disabled={!canGenerate || isGenerating || isSaving}
            className="h-10 shrink-0 rounded-xl bg-[#6554F5] px-4 font-medium shadow-sm shadow-violet-500/20 hover:bg-[#5846E7]"
          >
            <WandSparkles aria-hidden="true" size={16} />
            AI Generate Tasks
          </Button>
        </div>
        {notice && (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
          >
            <Check aria-hidden="true" size={16} />
            {notice}
          </p>
        )}
      </section>

      {dialogOpen && (
        <dialog
          ref={dialogRef}
          aria-labelledby="ai-task-dialog-title"
          onCancel={(event) => {
            event.preventDefault();
            if (!isGenerating && !isSaving) closeDialog();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget && !isGenerating && !isSaving) {
              closeDialog();
            }
          }}
          className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
        >
          <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            <div>
              <h2
                id="ai-task-dialog-title"
                className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                <Sparkles aria-hidden="true" size={18} className="text-violet-600 dark:text-violet-300" />
                Generate tasks with Gemini
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Describe the project goal. Choose which generated suggestions to save.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close dialog"
              onClick={closeDialog}
              disabled={isGenerating || isSaving}
              className="-mr-2 -mt-2 shrink-0 rounded-lg text-slate-500"
            >
              <X aria-hidden="true" size={18} />
            </Button>
          </header>

          <div className="p-5 sm:p-6">
            <form
                ref={formRef}
                onSubmit={generateTasks}
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
              >
              <div className="space-y-2">
                <Label htmlFor="task-generation-goal" className="text-slate-700 dark:text-slate-200">
                  Project goal or task description
                </Label>
                <textarea
                  id="task-generation-goal"
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={3}
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="For example: Launch a refreshed product website with clearer onboarding..."
                  className="flex w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <p className="text-xs text-slate-400">
                  10-4,000 characters. Quotas: 3 per minute and 10 per day per account.
                </p>
              </div>
              <Button
                type="submit"
                disabled={
                  isGenerating || isSaving || goal.trim().length < 10 || !canGenerate
                }
                className="h-10 rounded-xl bg-[#6554F5] px-4 font-medium shadow-sm shadow-violet-500/20 hover:bg-[#5846E7]"
              >
                {isGenerating ? (
                  <LoaderCircle
                    aria-hidden="true"
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <WandSparkles aria-hidden="true" size={16} />
                )}
                {isGenerating ? "Generating..." : "Generate suggestions"}
              </Button>
            </form>

            {error && (
              <div
                role="alert"
                className="mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="flex items-start gap-2">
                  <AlertCircle
                    aria-hidden="true"
                    size={16}
                    className="mt-0.5 shrink-0"
                  />
                  {error}
                </p>
                {canRetry && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => formRef.current?.requestSubmit()}
                    disabled={isGenerating || isSaving}
                    className="h-8 shrink-0 rounded-lg border-red-200 bg-white px-3 text-red-700 hover:bg-red-100 hover:text-red-800"
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Review Gemini suggestions
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Edit details, accept suggestions individually, or reject them.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={acceptSuggestions}
                    disabled={
                      isSaving || !suggestions.some((suggestion) => suggestion.accepted)
                    }
                    className="h-9 rounded-xl bg-[#6554F5] px-3 font-medium hover:bg-[#5846E7]"
                  >
                    {isSaving ? (
                      <LoaderCircle
                        aria-hidden="true"
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Check aria-hidden="true" size={15} />
                    )}
                    {isSaving
                      ? "Saving..."
                      : `Save ${suggestions.filter((item) => item.accepted).length} accepted`}
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {suggestions.map((suggestion, index) => (
                    <article
                      key={suggestion.key}
                      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Label
                          htmlFor={`suggestion-title-${suggestion.key}`}
                          className="text-xs font-medium text-slate-500 dark:text-slate-400"
                        >
                          Task {index + 1}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Reject ${suggestion.title}`}
                          disabled={isSaving}
                          onClick={() =>
                            setSuggestions((current) =>
                              current.filter((item) => item.key !== suggestion.key),
                            )
                          }
                          className="size-8 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 aria-hidden="true" size={15} />
                        </Button>
                      </div>
                      <Input
                        id={`suggestion-title-${suggestion.key}`}
                        value={suggestion.title}
                        maxLength={160}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateSuggestion(
                            suggestion.key,
                            "title",
                            event.target.value,
                          )
                        }
                        className="mt-2 h-10 rounded-lg border-slate-200 bg-white font-medium dark:border-slate-700 dark:bg-slate-900"
                      />
                      <Label
                        htmlFor={`suggestion-description-${suggestion.key}`}
                        className="sr-only"
                      >
                        Task description {index + 1}
                      </Label>
                      <textarea
                        id={`suggestion-description-${suggestion.key}`}
                        value={suggestion.description}
                        maxLength={2000}
                        rows={2}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateSuggestion(
                            suggestion.key,
                            "description",
                            event.target.value,
                          )
                        }
                        placeholder="Optional description"
                        className="mt-2 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`suggestion-priority-${suggestion.key}`}
                            className="text-xs text-slate-500"
                          >
                            Priority
                          </Label>
                          <select
                            id={`suggestion-priority-${suggestion.key}`}
                            value={suggestion.priority}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateSuggestion(
                                suggestion.key,
                                "priority",
                                event.target.value,
                              )
                            }
                            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs capitalize text-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        <Button
                          type="button"
                          variant={suggestion.accepted ? "secondary" : "outline"}
                          disabled={isSaving}
                          aria-pressed={suggestion.accepted}
                          onClick={() =>
                            setSuggestions((current) =>
                              current.map((item) =>
                                item.key === suggestion.key
                                  ? { ...item, accepted: !item.accepted }
                                  : item,
                              ),
                            )
                          }
                          className="h-8 rounded-lg px-3 text-xs"
                        >
                          {suggestion.accepted ? (
                            <Check aria-hidden="true" size={14} />
                          ) : null}
                          {suggestion.accepted ? "Accepted" : "Accept"}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
