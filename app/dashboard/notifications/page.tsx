import { NotificationList } from "@/components/dashboard/notification-bell";
import { createClient } from "@/lib/supabase/server";
import { getNotificationFeed } from "@/lib/notifications";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CollectionPageSkeleton } from "@/components/dashboard/suspense-skeletons";

export default function NotificationsPage() {
  return (
    <Suspense fallback={<CollectionPageSkeleton label="notifications" />}>
      <NotificationsContent />
    </Suspense>
  );
}

async function NotificationsContent() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/auth/login");

  const [notifications, unreadResult] = await Promise.all([
    getNotificationFeed(supabase, user.id),
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
    <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-9">
      <header className="mb-7">
        <p className="text-sm font-semibold text-violet-600 dark:text-violet-300">Stay up to date</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Due dates and task updates from your projects.
        </p>
      </header>
      <NotificationList
        initialNotifications={notifications}
        initialUnreadCount={unreadResult.count ?? 0}
      />
    </div>
  );
}
