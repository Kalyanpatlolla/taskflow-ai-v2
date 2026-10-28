"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ProjectError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <section
        role="alert"
        className="flex flex-col items-center rounded-2xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertCircle aria-hidden="true" size={22} />
        </span>
        <h1 className="mt-4 text-base font-semibold text-slate-900">
          Could not load this project
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          Project and task data could not be retrieved. Check your connection
          and try again.
        </p>
        <Button
          type="button"
          onClick={reset}
          className="mt-5 h-10 rounded-xl bg-indigo-600 px-4 font-medium hover:bg-indigo-700"
        >
          <RefreshCw aria-hidden="true" size={16} />
          Try again
        </Button>
      </section>
    </div>
  );
}
