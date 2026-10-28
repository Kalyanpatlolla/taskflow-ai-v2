import { updateProject } from "@/app/dashboard/projects/actions";
import { ProjectForm } from "@/components/dashboard/project-form";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CollectionPageSkeleton } from "@/components/dashboard/suspense-skeletons";

export default function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<CollectionPageSkeleton label="edit" />}>
      <EditProjectContent params={params} />
    </Suspense>
  );
}

async function EditProjectContent({
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

  const [projectResult, workspaceResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, workspace_id, name, description")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (projectResult.error) {
    throw new Error(`Unable to load project: ${projectResult.error.message}`);
  }
  if (workspaceResult.error) {
    throw new Error(`Unable to load workspaces: ${workspaceResult.error.message}`);
  }
  if (!projectResult.data) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <Link
        href={`/dashboard/projects/${projectResult.data.id}`}
        className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Back to project
      </Link>
      <header className="mb-7">
        <p className="mb-2 text-sm font-medium text-indigo-600">
          Project details
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Edit project
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Update the project name, workspace, or description.
        </p>
      </header>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
        {workspaceResult.data.length ? (
          <ProjectForm
            workspaces={workspaceResult.data}
            action={updateProject}
            project={projectResult.data}
          />
        ) : (
          <p className="text-sm text-slate-600">
            This project has no available workspace. Contact support before
            editing it.
          </p>
        )}
      </section>
    </div>
  );
}
