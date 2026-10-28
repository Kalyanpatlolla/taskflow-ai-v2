"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type TaskFormState = {
  error?: string;
  success?: boolean;
};

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
const priorities: TaskPriority[] = ["low", "medium", "high"];

async function getAuthenticatedProject(projectId: string) {
  if (!uuidPattern.test(projectId)) {
    return { error: "The project could not be identified." } as const;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    return { error: `Unable to verify project: ${error.message}` } as const;
  }
  if (!project) {
    return { error: "This project could not be found in your account." } as const;
  }

  return { supabase, user, project } as const;
}

function readTaskFields(formData: FormData) {
  const titleValue = formData.get("title");
  const descriptionValue = formData.get("description");
  const priorityValue = formData.get("priority");
  const dueDateValue = formData.get("due_date");

  if (typeof titleValue !== "string" || typeof priorityValue !== "string") {
    return { error: "Enter a task title and choose a priority." } as const;
  }

  if (
    (descriptionValue !== null && typeof descriptionValue !== "string") ||
    (dueDateValue !== null && typeof dueDateValue !== "string")
  ) {
    return { error: "Enter valid task details." } as const;
  }

  const title = titleValue.trim();
  const description =
    typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  const dueDate = typeof dueDateValue === "string" ? dueDateValue.trim() : "";

  if (!title) return { error: "Task title is required." } as const;
  if (title.length > 160) {
    return { error: "Task titles must be 160 characters or fewer." } as const;
  }
  if (description.length > 2000) {
    return {
      error: "Task descriptions must be 2,000 characters or fewer.",
    } as const;
  }
  if (!priorities.includes(priorityValue as TaskPriority)) {
    return { error: "Choose a valid task priority." } as const;
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(title + description)) {
    return { error: "Task details contain unsupported characters." } as const;
  }
  if (dueDate && !isValidDate(dueDate)) {
    return { error: "Enter a valid deadline." } as const;
  }

  return {
    title,
    description,
    priority: priorityValue as TaskPriority,
    dueDate: dueDate || null,
  } as const;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function refreshTaskRoutes(projectId: string) {
  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath("/dashboard");
}

export async function createTask(
  projectId: string,
  _previousState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const context = await getAuthenticatedProject(projectId);
  if ("error" in context) return { error: context.error };

  const fields = readTaskFields(formData);
  if ("error" in fields) return fields;

  const { error } = await context.supabase.from("tasks").insert({
    project_id: context.project.id,
    owner_id: context.user.id,
    title: fields.title,
    description: fields.description || null,
    status: "todo",
    priority: fields.priority,
    due_date: fields.dueDate,
  });

  if (error) return { error: `Unable to create task: ${error.message}` };

  refreshTaskRoutes(projectId);
  return { success: true };
}

export async function updateTask(
  projectId: string,
  _previousState: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const context = await getAuthenticatedProject(projectId);
  if ("error" in context) return { error: context.error };

  const taskId = formData.get("task_id");
  if (typeof taskId !== "string" || !uuidPattern.test(taskId)) {
    return { error: "The task could not be identified." };
  }

  const fields = readTaskFields(formData);
  if ("error" in fields) return fields;

  const { data, error } = await context.supabase
    .from("tasks")
    .update({
      title: fields.title,
      description: fields.description || null,
      priority: fields.priority,
      due_date: fields.dueDate,
    })
    .eq("id", taskId)
    .eq("project_id", context.project.id)
    .eq("owner_id", context.user.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `Unable to update task: ${error.message}` };
  if (!data) return { error: "This task could not be found in this project." };

  refreshTaskRoutes(projectId);
  return { success: true };
}

export async function updateTaskStatus(
  projectId: string,
  taskId: string,
  status: string,
): Promise<TaskFormState> {
  const context = await getAuthenticatedProject(projectId);
  if ("error" in context) return { error: context.error };
  if (!uuidPattern.test(taskId)) {
    return { error: "The task could not be identified." };
  }
  if (!statuses.includes(status as TaskStatus)) {
    return { error: "Choose a valid task status." };
  }

  const { data, error } = await context.supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("project_id", context.project.id)
    .eq("owner_id", context.user.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `Unable to update task status: ${error.message}` };
  if (!data) return { error: "This task could not be found in this project." };

  refreshTaskRoutes(projectId);
  return { success: true };
}

export async function deleteTask(
  projectId: string,
  taskId: string,
): Promise<TaskFormState> {
  const context = await getAuthenticatedProject(projectId);
  if ("error" in context) return { error: context.error };
  if (!uuidPattern.test(taskId)) {
    return { error: "The task could not be identified." };
  }

  const { data, error } = await context.supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", context.project.id)
    .eq("owner_id", context.user.id)
    .select("id")
    .maybeSingle();

  if (error) return { error: `Unable to delete task: ${error.message}` };
  if (!data) return { error: "This task could not be found in this project." };

  refreshTaskRoutes(projectId);
  return { success: true };
}
