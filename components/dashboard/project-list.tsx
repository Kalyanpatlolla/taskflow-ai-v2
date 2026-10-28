import { ArrowUpRight, FolderKanban } from "lucide-react";
import Link from "next/link";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  workspace_name: string;
};

export function ProjectList({ projects }: { projects: ProjectListItem[] }) {
  if (!projects.length) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <FolderKanban aria-hidden="true" size={21} />
        </span>
        <h2 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
          No projects yet
        </h2>
        <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
          Create a project using the form to get your work organized.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
      {projects.map((project) => (
        <li key={project.id} className="group">
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="flex h-full items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-900"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-blue-100 text-violet-600 dark:from-violet-950 dark:to-blue-950 dark:text-violet-300">
              <FolderKanban aria-hidden="true" size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                {project.name}
              </p>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500 dark:text-slate-400">
                {project.description || "No description"}
              </p>
              <p className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {project.workspace_name}
              </p>
              <time
                dateTime={project.created_at}
                className="mt-3 block text-xs text-slate-400"
              >
                Created {dateFormatter.format(new Date(project.created_at))}
              </time>
            </div>
            <ArrowUpRight
              aria-hidden="true"
              size={16}
              className="shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-600"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
