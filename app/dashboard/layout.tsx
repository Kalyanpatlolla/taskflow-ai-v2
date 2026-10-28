import { Suspense } from "react";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { createClient } from "@/lib/supabase/server";
import { getNotificationFeed } from "@/lib/notifications";
import { redirect } from "next/navigation";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}

async function AuthenticatedDashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const { error: reminderError } = await supabase.rpc(
    "generate_due_task_notifications",
  );
  if (reminderError) {
    throw new Error(`Unable to generate task reminders: ${reminderError.message}`);
  }

  const notificationBaseline = new Date().toISOString();
  const [notifications, unreadResult] = await Promise.all([
    getNotificationFeed(supabase, user.id, 8),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);
  if (unreadResult.error) {
    throw new Error(`Unable to count notifications: ${unreadResult.error.message}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <DashboardSidebar email={user.email ?? ""} />
      <main className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 sm:px-8">
          <div className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200 md:hidden">
            TaskFlow <span className="text-violet-500">AI</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <NotificationBell
              userId={user.id}
              initialNotifications={notifications}
              initialNotificationBaseline={
                notifications[0]?.created_at ?? notificationBaseline
              }
              initialUnreadCount={unreadResult.count ?? 0}
            />
          </div>
        </header>
        <div className="page-enter">{children}</div>
      </main>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div
      aria-label="Loading dashboard"
      aria-busy="true"
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      <div className="h-16 border-b border-slate-200 bg-white md:fixed md:inset-y-0 md:left-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="size-9 animate-pulse rounded-xl bg-indigo-100" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="hidden space-y-3 px-4 py-8 md:block">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 md:pl-72">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-44 animate-pulse rounded bg-indigo-100" />
          <div className="h-8 w-64 max-w-full animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-slate-200/80 bg-white"
            />
          ))}
        </div>
        <div className="mt-8 h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
      </div>
    </div>
  );
}
