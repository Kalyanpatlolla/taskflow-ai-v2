import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { createClient } from "@/lib/supabase/server";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FolderKanban,
  ListTodo,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  DashboardOverviewSkeleton,
} from "@/components/dashboard/suspense-skeletons";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardOverviewSkeleton />}>
      <DashboardOverview />
    </Suspense>
  );
}

async function DashboardOverview() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const today = new Date().toISOString().slice(0, 10);
  const [projectsResult, projectCountResult, taskCountResult, completedResult, overdueResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, description, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "done"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .lt("due_date", today)
        .neq("status", "done"),
    ]);

  const queryError =
    projectsResult.error ??
    projectCountResult.error ??
    taskCountResult.error ??
    completedResult.error ??
    overdueResult.error;

  if (queryError) {
    throw new Error(`Unable to load dashboard data: ${queryError.message}`);
  }

  const projects = projectsResult.data ?? [];
  const totalTasks = taskCountResult.count ?? 0;
  const completedTasks = completedResult.count ?? 0;
  const completionRate = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;
  const metrics = [
    {
      label: "Total Projects",
      value: projectCountResult.count ?? 0,
      icon: FolderKanban,
      color: "violet",
      note: "Across all workspaces",
      progress: Math.min(projectCountResult.count ?? 0, 100),
    },
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: ListTodo,
      color: "blue",
      note: "Across all projects",
      progress: Math.min(totalTasks, 100),
    },
    {
      label: "Completed Tasks",
      value: completedTasks,
      icon: CheckCircle2,
      color: "green",
      note: `${completionRate}% of all tasks`,
      progress: completionRate,
    },
    {
      label: "Overdue Tasks",
      value: overdueResult.count ?? 0,
      icon: Clock3,
      color: "coral",
      note: "Past due and still open",
      progress: totalTasks
        ? Math.round(((overdueResult.count ?? 0) / totalTasks) * 100)
        : 0,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
      <header className="relative mb-8 flex flex-col gap-6 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#6554F5] via-[#6554F5] to-[#287CF5] px-6 py-7 text-white shadow-xl shadow-violet-900/15 sm:flex-row sm:items-center sm:justify-between sm:px-9 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-20 size-72 rounded-full border-[36px] border-white/10" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[-8rem] right-1/3 size-64 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative">
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-violet-100">
            <span className="size-2 rounded-full bg-emerald-300" />
            Your workspace at a glance
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Good to see you{user.email ? `, ${user.email.split("@")[0]}` : ""}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-violet-100">
            Your ideas are moving forward. Here&apos;s what&apos;s happening across your projects today.
          </p>
        </div>
        <div className="relative shrink-0 [&_button]:border-white/20 [&_button]:bg-white [&_button]:text-violet-700 [&_button]:shadow-lg [&_button]:shadow-violet-950/10 [&_button]:hover:bg-violet-50">
          <CreateWorkspaceDialog />
        </div>
      </header>

      <section
        aria-label="Task and project metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(({ label, value, icon: Icon, color, note, progress }) => (
          <article
            key={label}
            className="dashboard-card group p-5"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
              <span
                className={`flex size-10 items-center justify-center rounded-xl ${
                  color === "violet"
                    ? "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
                    : color === "blue"
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                      : color === "green"
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
                }`}
              >
                <Icon aria-hidden="true" size={19} strokeWidth={1.9} />
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {value}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${
                    color === "violet"
                      ? "bg-violet-500"
                      : color === "blue"
                        ? "bg-blue-500"
                        : color === "green"
                          ? "bg-emerald-500"
                          : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="shrink-0 text-xs text-slate-400">{note}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-card mt-8 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent projects
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Pick up where you left off.
            </p>
          </div>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300"
          >
            View all projects
            <ArrowUpRight aria-hidden="true" size={15} />
          </Link>
        </div>

        {projects.length ? (
          <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            {projects.map((project) => (
              <li
                key={project.id}
                className="group rounded-xl border border-slate-100 p-4 transition hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-800 dark:hover:border-violet-900 dark:hover:bg-violet-950/20"
              >
                <Link href={`/dashboard/projects/${project.id}`} className="flex items-start gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 text-violet-600 dark:from-violet-950 dark:to-blue-950 dark:text-violet-300">
                    <FolderKanban aria-hidden="true" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {project.name}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                      {project.description || "No description added"}
                    </p>
                    <time
                      dateTime={project.created_at}
                      className="mt-3 block text-xs text-slate-400"
                    >
                      Created {dateFormatter.format(new Date(project.created_at))}
                    </time>
                  </div>
                  <ArrowUpRight aria-hidden="true" size={16} className="mt-1 shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-600" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <AlertCircle aria-hidden="true" size={21} />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-slate-800">
              No projects yet
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Create a workspace to bring your projects and tasks together.
            </p>
            <CreateWorkspaceDialog
              className="mt-5"
              label="Create your first workspace"
              icon={<Plus aria-hidden="true" size={16} />}
            />
          </div>
        )}
      </section>
    </div>
  );
}
