import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type NotificationItem = {
  id: string;
  task_id: string;
  type: "due_tomorrow" | "due_today" | "overdue" | "task_completed";
  content: string;
  read_at: string | null;
  created_at: string;
  project_id: string;
};

export async function getNotificationFeed(
  supabase: SupabaseServerClient,
  userId: string,
  limit = 50,
) {
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, task_id, type, content, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to load notifications: ${error.message}`);
  }

  const taskIds = [...new Set(notifications.map(({ task_id }) => task_id))];
  if (!taskIds.length) return [] as NotificationItem[];

  const { data: tasks, error: taskError } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("owner_id", userId)
    .in("id", taskIds);

  if (taskError) {
    throw new Error(`Unable to load notification links: ${taskError.message}`);
  }

  const projectIds = new Map(tasks.map((task) => [task.id, task.project_id]));
  return notifications.flatMap((notification) => {
    const projectId = projectIds.get(notification.task_id);
    if (!projectId) return [];
    return [{ ...notification, project_id: projectId }] as NotificationItem[];
  });
}
