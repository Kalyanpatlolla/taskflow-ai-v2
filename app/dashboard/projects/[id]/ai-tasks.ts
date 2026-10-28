"use server";

import { createClient } from "@/lib/supabase/server";
import { acceptedTasksSchema } from "@/lib/task-ai-schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const projectIdSchema = z.string().uuid();

export async function saveSuggestedTasks(
  projectId: string,
  input: unknown,
): Promise<{ error?: string; success?: boolean; savedCount?: number }> {
  if (!projectIdSchema.safeParse(projectId).success) {
    return { error: "Invalid project ID." };
  }

  const parsedTasks = acceptedTasksSchema.safeParse(input);
  if (!parsedTasks.success) {
    return { error: "Select between 1 and 8 valid task suggestions." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/login");

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (projectError) {
    return { error: "Unable to verify project ownership." };
  }
  if (!project) {
    return { error: "Project not found in your account." };
  }

  const { error } = await supabase.from("tasks").insert(
    parsedTasks.data.map((task) => ({
      project_id: project.id,
      owner_id: user.id,
      title: task.title,
      description: task.description || null,
      status: "todo",
      priority: task.priority,
      due_date: null,
    })),
  );

  if (error) {
    return { error: `Unable to save suggested tasks: ${error.message}` };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { success: true, savedCount: parsedTasks.data.length };
}
