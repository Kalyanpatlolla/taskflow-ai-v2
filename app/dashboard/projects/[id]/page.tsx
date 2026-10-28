import { DeleteProjectButton } from "@/components/dashboard/delete-project-button";
import { AiTaskAssistant } from "@/components/dashboard/ai-task-assistant";
import { TaskBoard, type TaskRecord } from "@/components/dashboard/task-board";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CalendarDays,
  FolderKanban,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ProjectDetailSkeleton } from "@/components/dashboard/suspense-skeletons";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ProjectDetailSkeleton />}>
      <ProjectDetailContent params={params} />
    </Suspense>
  );
}

async function ProjectDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    .select("id, workspace_id, owner_id, name, description, created_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load project: ${error.message}`);
  }
  if (!project) notFound();

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", project.workspace_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError) {
    throw new Error(`Unable to load project workspace: ${workspaceError.message}`);
  }
  if (!workspace) notFound();

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_date, created_at")
    .eq("project_id", project.id)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (taskError) {
    throw new Error(`Unable to load project tasks: ${taskError.message}`);
  }

  const tasks: TaskRecord[] = taskRows.map((task) => ({
    ...task,
    status: task.status as TaskRecord["status"],
    priority: task.priority as TaskRecord["priority"],
  }));

  return (
    <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
      <Link
        href="/dashboard/projects"
        className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-700 dark:text-slate-400 dark:hover:text-violet-300"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        All projects
      </Link>

      <section className="dashboard-card p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-blue-100 text-violet-600 dark:from-violet-950 dark:to-blue-950 dark:text-violet-300">
              <FolderKanban aria-hidden="true" size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-300">
                {workspace.name}
              </p>
              <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                {project.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {project.description || "No description added."}
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <CalendarDays aria-hidden="true" size={14} />
                Created {dateFormatter.format(new Date(project.created_at))}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-xl border-slate-200 px-4 dark:border-slate-700"
            >
              <Link href={`/dashboard/projects/${project.id}/edit`}>
                <Pencil aria-hidden="true" size={15} />
                Edit
              </Link>
            </Button>
            <DeleteProjectButton projectId={project.id} />
          </div>
        </div>
      </section>

      <AiTaskAssistant
        projectId={project.id}
        geminiConfigured={Boolean(process.env.GEMINI_API_KEY)}
        rateLimitConfigured={Boolean(
          process.env.UPSTASH_REDIS_REST_URL &&
            process.env.UPSTASH_REDIS_REST_TOKEN,
        )}
      />
      <TaskBoard projectId={project.id} tasks={tasks} />

      <p className="mt-4 text-xs leading-5 text-slate-400 dark:text-slate-500">
        Deleting this project permanently deletes its tasks as well.
      </p>
    </div>
  );
}
