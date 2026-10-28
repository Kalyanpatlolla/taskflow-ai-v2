import { GoogleGenAI, Type } from "@google/genai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";
import {
  taskGenerationRequestSchema,
  taskSuggestionsSchema,
} from "@/lib/task-ai-schema";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const MAX_BODY_BYTES = 8 * 1024;
const TOTAL_REQUEST_TIMEOUT_MS = 27_000;
const PROVIDER_ATTEMPT_TIMEOUT_MS = 11_000;
const MAX_PROVIDER_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 350;

const taskResponseSchema = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      minItems: 3,
      maxItems: 8,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          priority: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
          },
        },
        required: ["title", "description", "priority"],
      },
    },
  },
  required: ["tasks"],
};

const modelResponseSchema = z.object({
  tasks: taskSuggestionsSchema,
});

function jsonError(message: string, status: number, retryAfter?: number) {
  const headers = retryAfter
    ? { "Retry-After": String(Math.max(1, Math.ceil(retryAfter / 1000))) }
    : undefined;
  return NextResponse.json({ error: message }, { status, headers });
}

async function readRequestBody(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { error: "Request body is too large." } as const;
  }
  if (!request.body) return { error: "Request body is required." } as const;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      return { error: "Request body is too large." } as const;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { data: JSON.parse(new TextDecoder().decode(bytes)) } as const;
  } catch {
    return { error: "Request body must be valid JSON." } as const;
  }
}

function createRateLimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  return [
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 m"),
      prefix: "taskflow:gemini:minute",
      analytics: false,
    }),
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 d"),
      prefix: "taskflow:gemini:daily",
      analytics: false,
    }),
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 d"),
      prefix: "taskflow:gemini:global-daily",
      analytics: false,
    }),
  ] as const;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return jsonError("Invalid project ID.", 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonError("Sign in to generate tasks.", 401);
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (projectError) {
    return jsonError("Unable to verify project ownership.", 500);
  }
  if (!project) {
    return jsonError("Project not found.", 404);
  }

  const bodyResult = await readRequestBody(request);
  if (!("data" in bodyResult)) return jsonError(bodyResult.error, 400);

  const requestResult = taskGenerationRequestSchema.safeParse(bodyResult.data);
  if (!requestResult.success) {
    return jsonError("Describe your goal in 10-4,000 characters.", 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError("Gemini is temporarily unavailable because it is not configured.", 503);
  }

  const rateLimiters = createRateLimiters();
  if (!rateLimiters) {
    return jsonError("AI generation rate limiting is not configured.", 503);
  }

  let limits: Awaited<ReturnType<(typeof rateLimiters)[number]["limit"]>>[];
  try {
    limits = await Promise.all([
      rateLimiters[0].limit(user.id),
      rateLimiters[1].limit(user.id),
      rateLimiters[2].limit("all-users"),
    ]);
  } catch {
    return jsonError("AI generation is temporarily unavailable.", 503);
  }

  const rejectedLimit = limits.find((limit) => !limit.success);
  if (rejectedLimit) {
    return jsonError(
      "Task generation quota reached. Please try again later.",
      429,
      rejectedLimit.reset - Date.now(),
    );
  }

  const deadline = Date.now() + TOTAL_REQUEST_TIMEOUT_MS;
  const ai = new GoogleGenAI({ apiKey });
  let lastProviderError: unknown;

  for (let attempt = 0; attempt < MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return jsonError("Gemini timed out. Please retry in a moment.", 504);
    }

    try {
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  "Create 3 to 8 clear, actionable subtasks for the project below.",
                  "Return task titles, concise useful descriptions and a priority of low, medium, or high.",
                  "Do not include dates or status.",
                  `Project: ${project.name}`,
                  `Goal: ${requestResult.data.goal}`,
                ].join("\n"),
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: taskResponseSchema,
          maxOutputTokens: 2048,
          httpOptions: {
            timeout: Math.min(PROVIDER_ATTEMPT_TIMEOUT_MS, remaining),
            retryOptions: { attempts: 1 },
          },
        },
      });

      if (!response.text) {
        return jsonError("Gemini is temporarily unavailable and returned no task suggestions.", 503);
      }

      let output: unknown;
      try {
        output = JSON.parse(response.text);
      } catch {
        return jsonError("Gemini is temporarily unavailable and returned an invalid response.", 503);
      }

      const parsedOutput = modelResponseSchema.safeParse(output);
      if (!parsedOutput.success) {
        return jsonError("Gemini is temporarily unavailable and returned invalid task suggestions.", 503);
      }

      return NextResponse.json({
        mode: "gemini",
        suggestions: parsedOutput.data.tasks,
      });
    } catch (error) {
      lastProviderError = error;
      const status = getProviderStatus(error);
      const transient = isTransientProviderError(error, status);

      if (!transient) {
        if (status === 404) {
          return jsonError(
            "The configured Gemini model was not found. Check GEMINI_MODEL.",
            503,
          );
        }
        return jsonError("Gemini could not generate tasks. Please try again.", 503);
      }

      if (attempt + 1 >= MAX_PROVIDER_ATTEMPTS) break;
      const backoff = RETRY_BACKOFF_MS * 2 ** attempt;
      if (Date.now() + backoff >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  if (
    Date.now() >= deadline ||
    getProviderStatus(lastProviderError) === 504 ||
    isTimeoutError(lastProviderError)
  ) {
    return jsonError("Gemini timed out after a retry. Please try again shortly.", 504);
  }
  const lastStatus = getProviderStatus(lastProviderError);
  if (lastStatus === 429) {
    return jsonError("Gemini is rate limited right now. Please try again shortly.", 429);
  }
  return jsonError("Gemini is temporarily unavailable. Please try again shortly.", 503);
}

function getProviderStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("status" in error && typeof error.status === "number") return error.status;
  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }
  return undefined;
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /timeout|timed out|deadline_exceeded|deadline exceeded|abort/i.test(
      `${error.name} ${error.message}`,
    )
  );
}

function isTransientProviderError(error: unknown, status: number | undefined) {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    isTimeoutError(error)
  );
}
