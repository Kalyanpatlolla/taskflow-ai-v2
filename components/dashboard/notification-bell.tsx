"use client";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/dashboard/notifications/actions";
import {
  playNotificationChime,
  useNotificationPreferences,
} from "@/lib/notification-preferences";
import type { NotificationItem } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck, CircleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

type NotificationInsert = Omit<NotificationItem, "project_id"> & {
  user_id: string;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function NotificationBell({
  userId,
  initialNotifications,
  initialNotificationBaseline,
  initialUnreadCount,
}: {
  userId: string;
  initialNotifications: NotificationItem[];
  initialNotificationBaseline: string;
  initialUnreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const preferences = useNotificationPreferences();
  const preferencesRef = useRef(preferences);
  const seenNotificationIds = useRef(
    new Set(initialNotifications.map(({ id }) => id)),
  );
  preferencesRef.current = preferences;

  useEffect(() => {
    const supabase = createClient();
    const startedAt = initialNotificationBaseline;
    let lastPolledAt = startedAt;
    let stopped = false;

    async function receiveNotification(notification: NotificationInsert) {
      if (
        stopped ||
        notification.user_id !== userId ||
        new Date(notification.created_at).getTime() <=
          new Date(startedAt).getTime() ||
        seenNotificationIds.current.has(notification.id)
      ) {
        return;
      }

      seenNotificationIds.current.add(notification.id);
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("project_id")
        .eq("id", notification.task_id)
        .eq("owner_id", userId)
        .maybeSingle();

      if (stopped) return;
      if (taskError) {
        seenNotificationIds.current.delete(notification.id);
        setError(`Unable to load new notification: ${taskError.message}`);
        return;
      }
      if (!task) return;

      const item: NotificationItem = {
        ...notification,
        project_id: task.project_id,
      };
      setNotifications((current) => [item, ...current].slice(0, 50));
      if (!notification.read_at) {
        setUnreadCount((count) => count + 1);
      }

      const activePreferences = preferencesRef.current;
      if (activePreferences.doNotDisturb) return;

      if (activePreferences.sound) {
        void playNotificationChime().catch((playError: unknown) => {
          console.error("Unable to play a notification chime.", playError);
          setError(
            playError instanceof Error
              ? playError.message
              : "Unable to play a notification chime.",
          );
        });
      }

      if (
        activePreferences.desktop &&
        window.isSecureContext &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("TaskFlow AI", {
            body: "You have a new task update.",
          });
        } catch (notificationError) {
          console.error("Unable to show a desktop notification.", notificationError);
          setError("Unable to show a desktop notification in this browser.");
        }
      }

      if (
        activePreferences.vibration &&
        typeof navigator.vibrate === "function"
      ) {
        navigator.vibrate([150, 100, 150]);
      }
    }

    async function pollForNewNotifications() {
      const { data, error: queryError } = await supabase
        .from("notifications")
        .select("id, user_id, task_id, type, content, read_at, created_at")
        .eq("user_id", userId)
        .gte("created_at", lastPolledAt)
        .order("created_at", { ascending: true })
        .limit(100);

      if (stopped) return;
      if (queryError) {
        setError(`Unable to check for new notifications: ${queryError.message}`);
        return;
      }

      if (data.length) {
        lastPolledAt = data[data.length - 1].created_at;
        for (const notification of data) {
          await receiveNotification(notification);
        }
      }
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          void receiveNotification(payload.new as NotificationInsert);
        },
      )
      .subscribe();

    void pollForNewNotifications();
    const pollingInterval = window.setInterval(() => {
      void pollForNewNotifications();
    }, 30_000);

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || session?.user.id !== userId) {
        stopped = true;
        window.clearInterval(pollingInterval);
        void supabase.removeChannel(channel).catch((removeError: unknown) => {
          console.error("Unable to clean up notification subscription.", removeError);
        });
      }
    });

    return () => {
      stopped = true;
      authSubscription.unsubscribe();
      window.clearInterval(pollingInterval);
      void supabase.removeChannel(channel).catch((removeError: unknown) => {
        console.error("Unable to clean up notification subscription.", removeError);
      });
    };
  }, [initialNotificationBaseline, userId]);

  function markRead(id: string) {
    setError("");
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, read_at: item.read_at ?? new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) =>
        notifications.find((item) => item.id === id && !item.read_at)
          ? Math.max(0, count - 1)
          : count,
      );
    });
  }

  function markAllRead() {
    setError("");
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.error) {
        setError(result.error);
        return;
      }
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })),
      );
      setUnreadCount(0);
    });
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={
          unreadCount
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        aria-expanded={open}
        aria-controls="notification-menu"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Bell aria-hidden="true" size={19} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <section
          id="notification-menu"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-30 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900"
        >
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {unreadCount} unread
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={markAllRead}
                className="h-8 px-2 text-xs text-indigo-600"
              >
                <CheckCheck aria-hidden="true" size={14} />
                Mark all read
              </Button>
            )}
          </header>

          {error && (
            <p role="alert" className="px-4 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          {notifications.length ? (
            <ul className="max-h-[min(26rem,70vh)] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {notifications.slice(0, 8).map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => markRead(notification.id)}
                  isPending={isPending}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-5 py-9 text-center">
              <span               className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <Bell aria-hidden="true" size={18} />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
                You&apos;re all caught up
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Task reminders and updates will show here.
              </p>
            </div>
          )}

          <footer className="border-t border-slate-100 p-2 text-center dark:border-slate-800">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/40"
            >
              View all notifications
            </Link>
          </footer>
        </section>
      )}
    </div>
  );
}

export function NotificationList({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function markRead(id: string) {
    setError("");
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, read_at: item.read_at ?? new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) =>
        notifications.find((item) => item.id === id && !item.read_at)
          ? Math.max(0, count - 1)
          : count,
      );
    });
  }

  function markAllRead() {
    setError("");
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.error) {
        setError(result.error);
        return;
      }
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? readAt })),
      );
      setUnreadCount(0);
    });
  }

  return (
    <section className="dashboard-card overflow-hidden">
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            All notifications
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {unreadCount} unread
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={markAllRead}
            className="h-9 w-fit rounded-xl border-slate-200"
          >
            <CheckCheck aria-hidden="true" size={15} />
            {isPending ? "Updating..." : "Mark all as read"}
          </Button>
        )}
      </header>

      {error && (
        <p role="alert" className="px-5 py-3 text-sm text-red-600 sm:px-6">
          {error}
        </p>
      )}

      {notifications.length ? (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onMarkRead={() => markRead(notification.id)}
              isPending={isPending}
            />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Bell aria-hidden="true" size={21} />
          </span>
          <h3 className="mt-4 text-sm font-semibold text-slate-800">
            No notifications yet
          </h3>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
            Task due-date reminders and completed-task updates will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
  isPending,
  onNavigate,
}: {
  notification: NotificationItem;
  onMarkRead: () => void;
  isPending: boolean;
  onNavigate?: () => void;
}) {
  const icon =
    notification.type === "task_completed" ? (
      <Check aria-hidden="true" size={16} />
    ) : (
      <CircleAlert aria-hidden="true" size={16} />
    );

  return (
    <li
      className={`flex gap-3 px-4 py-3 ${
        notification.read_at
          ? "bg-white dark:bg-slate-900"
          : "bg-violet-50/70 dark:bg-violet-950/30"
      }`}
    >
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
          notification.type === "task_completed"
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
            : "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/dashboard/projects/${notification.project_id}#task-${notification.task_id}`}
          onClick={onNavigate}
          className="block rounded-sm text-left text-sm leading-5 text-slate-800 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-slate-200 dark:hover:text-violet-300"
        >
          <span className={!notification.read_at ? "font-semibold" : "font-medium"}>
            {notification.content}
          </span>
          <time
            dateTime={notification.created_at}
            className="mt-1 block text-xs text-slate-400"
          >
            {formatTime(notification.created_at)}
          </time>
        </Link>
        {!notification.read_at && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMarkRead}
            disabled={isPending}
            className="mt-1 h-7 px-1.5 text-xs text-indigo-600"
          >
            <Check aria-hidden="true" size={13} />
            Mark as read
          </Button>
        )}
      </div>
    </li>
  );
}
