"use client";

import {
  createWorkspace,
  type WorkspaceFormState,
} from "@/app/dashboard/workspaces/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState } from "react";

const initialState: WorkspaceFormState = {};

export function WorkspaceCreateForm({ onCancel }: { onCancel?: () => void }) {
  const [state, formAction, isPending] = useActionState(
    createWorkspace,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="workspace-name" className="text-slate-700">
          Workspace name
        </Label>
        <Input
          id="workspace-name"
          name="name"
          placeholder="e.g. Product team"
          required
          maxLength={80}
          autoComplete="organization"
          className="h-11 rounded-xl border-slate-200 bg-white"
        />
        <p className="text-xs text-slate-500">Use 1-80 characters.</p>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="h-10 rounded-xl border-slate-200 px-4"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-xl bg-[#6554F5] px-4 font-medium hover:bg-[#5846E7]"
        >
          {isPending ? "Creating..." : "Create workspace"}
        </Button>
      </div>
    </form>
  );
}
