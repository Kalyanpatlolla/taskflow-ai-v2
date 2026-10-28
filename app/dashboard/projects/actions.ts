"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProjectFormState = {
  error?: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return { supabase, user };
}

function getProjectFields(formData: FormData) {
  const submittedName = formData.get("name");
  const submittedDescription = formData.get("description");
  const workspaceId = formData.get("workspace_id");

  if (
    typeof submittedName !== "string" ||
    typeof workspaceId !== "string" ||
    !uuidPattern.test(workspaceId)
  ) {
    return { error: "Select a workspace and enter a project name." } as const;
  }

  if (
    submittedDescription !== null &&
    typeof submittedDescription !== "string"
  ) {
    return { error: "Enter a valid project description." } as const;
  }

  const name = submittedName.trim();
  const description =
    typeof submittedDescription === "string" ? submittedDescription.trim() : "";

  if (!name) {
    return { error: "Project name is required." } as const;
  }

  if (name.length > 120) {
    return { error: "Project names must be 120 characters or fewer." } as const;
  }

  if (description.length > 2000) {
    return {
      error: "Project descriptions must be 2,000 characters or fewer.",
    } as const;
  }

  if (/[\u0000-\u001f\u007f]/.test(name + description)) {
    return {
      error: "Project details cannot contain control characters.",
    } as const;
  }

  return { name, description, workspaceId } as const;
}

async function verifyWorkspaceOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  ownerId: string,
) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    return { error: `Unable to verify workspace: ${error.message}` };
  }

  if (!data) {
    return { error: "Choose a workspace that belongs to your account." };
  }

  return { error: null };
}

export async function createProject(
  _previousState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const { supabase, user } = await getAuthenticatedClient();
  const fields = getProjectFields(formData);
  if ("error" in fields) return fields;

  const workspace = await verifyWorkspaceOwnership(
    supabase,
    fields.workspaceId,
    user.id,
  );
  if (workspace.error) return workspace;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: fields.workspaceId,
      owner_id: user.id,
      name: fields.name,
      description: fields.description || null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Unable to create project: ${error.message}` };
  }

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${data.id}`);
}

export async function updateProject(
  _previousState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const { supabase, user } = await getAuthenticatedClient();
  const projectId = formData.get("project_id");
  if (typeof projectId !== "string" || !uuidPattern.test(projectId)) {
    return { error: "The project could not be identified." };
  }

  const fields = getProjectFields(formData);
  if ("error" in fields) return fields;

  const workspace = await verifyWorkspaceOwnership(
    supabase,
    fields.workspaceId,
    user.id,
  );
  if (workspace.error) return workspace;

  const { data, error } = await supabase
    .from("projects")
    .update({
      workspace_id: fields.workspaceId,
      name: fields.name,
      description: fields.description || null,
    })
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: `Unable to update project: ${error.message}` };
  }

  if (!data) {
    return { error: "This project could not be found in your account." };
  }

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${data.id}`);
}

export async function deleteProject(
  formData: FormData,
): Promise<ProjectFormState> {
  const { supabase, user } = await getAuthenticatedClient();
  const projectId = formData.get("project_id");
  if (typeof projectId !== "string" || !uuidPattern.test(projectId)) {
    return { error: "The project could not be identified." };
  }

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: `Unable to delete project: ${error.message}` };
  }

  if (!data) {
    return { error: "This project could not be found in your account." };
  }

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  redirect("/dashboard/projects");
}
