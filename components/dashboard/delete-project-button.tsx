"use client";

import { deleteProject } from "@/app/dashboard/projects/actions";
import { Button } from "@/components/ui/button";
import { useRef, useState, useTransition } from "react";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        "Delete this project? Its tasks will also be permanently deleted. This cannot be undone.",
      )
    ) {
      return;
    }

    setError(null);
    const form = formRef.current;
    if (!form) return;

    startTransition(async () => {
      const result = await deleteProject(new FormData(form));
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <form ref={formRef}>
        <input type="hidden" name="project_id" value={projectId} />
        <Button
          type="button"
          onClick={handleDelete}
          variant="outline"
          disabled={isPending}
          className="h-10 rounded-xl border-red-200 px-4 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          {isPending ? "Deleting..." : "Delete project"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
