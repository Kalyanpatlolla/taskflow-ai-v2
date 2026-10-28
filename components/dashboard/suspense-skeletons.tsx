function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800 ${className}`}
    />
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div
      aria-label="Loading project"
      aria-busy="true"
      className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9"
    >
      <SkeletonBlock className="mb-7 h-4 w-28 bg-violet-100 dark:bg-violet-950" />
      <section className="dashboard-card mb-6 p-5 sm:p-7">
        <div className="flex items-start gap-4">
          <SkeletonBlock className="size-12 shrink-0 rounded-2xl bg-violet-100 dark:bg-violet-950" />
          <div className="w-full space-y-3">
            <SkeletonBlock className="h-4 w-32 bg-violet-100 dark:bg-violet-950" />
            <SkeletonBlock className="h-8 w-64 max-w-full" />
            <SkeletonBlock className="h-4 w-full max-w-xl" />
            <SkeletonBlock className="h-3 w-36" />
          </div>
        </div>
      </section>
      <section className="mb-6 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 dark:border-violet-900/60 dark:from-violet-950/60 dark:via-slate-900 dark:to-blue-950/30 sm:p-6">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="size-10 rounded-xl bg-violet-200 dark:bg-violet-900" />
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-40 bg-violet-100 dark:bg-violet-950" />
            <SkeletonBlock className="h-3 w-64 max-w-[65vw]" />
          </div>
        </div>
      </section>
      <section className="dashboard-card mb-5 flex items-center justify-between p-5">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-7 w-48" />
        </div>
        <SkeletonBlock className="h-2 w-48 max-w-[35vw]" />
      </section>
      <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {["todo", "progress", "review", "done"].map((column) => (
          <section
            key={column}
            className="rounded-2xl border border-slate-200 bg-slate-100/70 p-3 dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="mb-4 flex items-center justify-between">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="size-6 rounded-full" />
            </div>
            <div className="space-y-3">
              <div className="dashboard-card space-y-3 p-4">
                <SkeletonBlock className="h-4 w-3/4" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-7 w-full" />
              </div>
              <div className="dashboard-card space-y-3 p-4">
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-7 w-full" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <div
      aria-label="Loading dashboard overview"
      aria-busy="true"
      className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9"
    >
      <div className="mb-8 h-48 animate-pulse rounded-[1.75rem] bg-gradient-to-br from-violet-200 to-blue-200 dark:from-violet-950 dark:to-blue-950" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="dashboard-card h-36 animate-pulse" />
        ))}
      </div>
      <div className="dashboard-card mt-8 h-72 animate-pulse" />
    </div>
  );
}

export function CollectionPageSkeleton({
  label,
}: {
  label: "projects" | "workspaces" | "notifications" | "edit";
}) {
  const isEdit = label === "edit";
  return (
    <div
      aria-label={`Loading ${label}`}
      aria-busy="true"
      className={`mx-auto px-5 py-7 sm:px-8 sm:py-9 ${
        label === "notifications" ? "max-w-5xl" : isEdit ? "max-w-3xl" : "max-w-7xl"
      }`}
    >
      <div className="mb-8 space-y-3">
        <SkeletonBlock className="h-4 w-36 bg-violet-100 dark:bg-violet-950" />
        <SkeletonBlock className="h-8 w-56 max-w-full" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>
      {isEdit ? (
        <div className="dashboard-card space-y-5 p-6">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-10 w-32" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="dashboard-card h-80 animate-pulse" />
          <div className="dashboard-card h-72 animate-pulse" />
        </div>
      )}
    </div>
  );
}
