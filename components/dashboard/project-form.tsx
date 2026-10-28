"use client";

import type { ProjectFormState } from "@/app/dashboard/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

type WorkspaceOption = {
  id: string;
  name: string;
};

type ProjectAction = (
  previousState: ProjectFormState,
  formData: FormData,
) => Promise<ProjectFormState>;

export function ProjectForm({
  workspaces,
  action,
  project,
}: {
  workspaces: WorkspaceOption[];
  action: ProjectAction;
  project?: {
    id: string;
    workspace_id: string;
    name: string;
    description: string | null;
  };
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {project && (
        <input type="hidden" name="project_id" value={project.id} />
      )}
      <div className="space-y-2">
        <Label htmlFor="project-name" className="text-slate-700">
          Project name
        </Label>
        <Input
          id="project-name"
          name="name"
          placeholder="e.g. Website refresh"
          required
          maxLength={120}
          defaultValue={project?.name ?? ""}
          className="h-11 rounded-xl border-slate-200 bg-white"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-workspace" className="text-slate-700">
          Workspace
        </Label>
        <select
          id="project-workspace"
          name="workspace_id"
          required
          defaultValue={project?.workspace_id ?? ""}
          className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
        >
          <option value="" disabled>
            Select a workspace
          </option>
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-description" className="text-slate-700">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <textarea
          id="project-description"
          name="description"
          placeholder="What is this project about?"
          maxLength={2000}
          rows={4}
          defaultValue={project?.description ?? ""}
          className="flex w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        disabled={isPending || workspaces.length === 0}
        className="h-10 rounded-xl bg-[#6554F5] px-4 font-medium hover:bg-[#5846E7]"
      >
        {isPending
          ? project
            ? "Saving..."
            : "Creating..."
          : project
            ? "Save changes"
            : "Create project"}
      </Button>
    </form>
  );
}
