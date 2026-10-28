"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type WorkspaceFormState = {
  error?: string;
};

export async function createWorkspace(
  _previousState: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const submittedName = formData.get("name");
  if (typeof submittedName !== "string") {
    return { error: "Enter a workspace name to continue." };
  }

  const name = submittedName.trim();
  if (!name) {
    return { error: "Enter a workspace name to continue." };
  }

  if (name.length > 80) {
    return { error: "Workspace names must be 80 characters or fewer." };
  }

  if (/[\u0000-\u001f\u007f]/.test(name)) {
    return { error: "Workspace names cannot contain control characters." };
  }

  const { error } = await supabase
    .from("workspaces")
    .insert({ owner_id: user.id, name });

  if (error) {
    return { error: `Unable to create workspace: ${error.message}` };
  }

  revalidatePath("/dashboard/workspaces");
  revalidatePath("/dashboard");
  redirect("/dashboard/workspaces");
}
