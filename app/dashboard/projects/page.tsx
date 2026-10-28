import { createProject } from "@/app/dashboard/projects/actions";
import { ProjectForm } from "@/components/dashboard/project-form";
import { ProjectList, type ProjectListItem } from "@/components/dashboard/project-list";
import { createClient } from "@/lib/supabase/server";
import { FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CollectionPageSkeleton } from "@/components/dashboard/suspense-skeletons";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<CollectionPageSkeleton label="projects" />}>
      <ProjectsContent />
    </Suspense>
  );
}

async function ProjectsContent() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const [workspaceResult, projectResult] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, workspace_id, name, description, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (workspaceResult.error) {
    throw new Error(`Unable to load workspaces: ${workspaceResult.error.message}`);
  }
  if (projectResult.error) {
    throw new Error(`Unable to load projects: ${projectResult.error.message}`);
  }

  const workspaceNames = new Map(
    workspaceResult.data.map((workspace) => [workspace.id, workspace.name]),
  );
  const projects: ProjectListItem[] = projectResult.data.map((project) => ({
    ...project,
    workspace_name: workspaceNames.get(project.workspace_id) ?? "Workspace",
  }));

  return (
    <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold text-violet-600 dark:text-violet-300">
          Plan and track your work
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Projects
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Keep project details and workspaces organized in one place.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="dashboard-card h-fit overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Your projects
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {projects.length}{" "}
                {projects.length === 1 ? "project" : "projects"}
              </p>
            </div>
            <FolderKanban aria-hidden="true" size={19} className="text-violet-600 dark:text-violet-300" />
          </div>
          <ProjectList projects={projects} />
        </section>

        <section className="dashboard-card h-fit p-5 sm:p-6">
          <div className="mb-5">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
              <Plus aria-hidden="true" size={19} />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Create a project
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Add a project to one of your workspaces.
            </p>
          </div>
          {workspaceResult.data.length ? (
            <ProjectForm
              workspaces={workspaceResult.data}
              action={createProject}
            />
          ) : (
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Create a workspace before adding a project.
              </p>
              <Link
                href="/dashboard/workspaces"
                className="mt-3 inline-flex text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300"
              >
                Go to workspaces
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
