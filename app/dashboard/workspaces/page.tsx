import { WorkspaceCreateForm } from "@/components/dashboard/workspace-create-form";
import { createClient } from "@/lib/supabase/server";
import { Building2, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CollectionPageSkeleton } from "@/components/dashboard/suspense-skeletons";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function WorkspacesPage() {
  return (
    <Suspense fallback={<CollectionPageSkeleton label="workspaces" />}>
      <WorkspacesContent />
    </Suspense>
  );
}

async function WorkspacesContent() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login");
  }

  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, name, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load workspaces: ${error.message}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold text-violet-600 dark:text-violet-300">
          Organize your work
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Workspaces
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Create a shared home for your projects and tasks.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="dashboard-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Your workspaces
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {workspaces.length}{" "}
              {workspaces.length === 1 ? "workspace" : "workspaces"}
            </p>
          </div>
          {workspaces.length ? (
            <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              {workspaces.map((workspace) => (
                <li key={workspace.id} className="flex items-start gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-violet-200 hover:bg-violet-50/40 dark:border-slate-800 dark:hover:border-violet-900 dark:hover:bg-violet-950/20">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 text-violet-600 dark:from-violet-950 dark:to-blue-950 dark:text-violet-300">
                    <Building2 aria-hidden="true" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {workspace.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Created{" "}
                      {dateFormatter.format(new Date(workspace.created_at))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <UsersRound aria-hidden="true" size={21} />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
                No workspaces yet
              </h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                Create your first workspace to get started.
              </p>
            </div>
          )}
        </section>

        <section className="dashboard-card h-fit p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Create a workspace
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Give your workspace a name you and your team will recognize.
            </p>
          </div>
          <WorkspaceCreateForm />
        </section>
      </div>
    </div>
  );
}
