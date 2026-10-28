export default function NotificationsLoading() {
  return (
    <div
      aria-label="Loading notifications"
      aria-busy="true"
      className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10"
    >
      <div className="mb-7 space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-indigo-100" />
        <div className="h-8 w-52 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  );
}
