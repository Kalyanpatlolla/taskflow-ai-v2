"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const notificationIdSchema = z.string().uuid();

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/auth/login");
  return { supabase, user };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ error?: string; success?: boolean }> {
  if (!notificationIdSchema.safeParse(notificationId).success) {
    return { error: "Invalid notification." };
  }

  const { supabase, user } = await getAuthenticatedUser();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { error: `Unable to mark notification read: ${error.message}` };
  if (!data) {
    const { data: existing, error: readError } = await supabase
      .from("notifications")
      .select("id")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError) return { error: `Unable to verify notification: ${readError.message}` };
    if (!existing) return { error: "Notification not found." };
  }

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function markAllNotificationsRead(): Promise<{
  error?: string;
  success?: boolean;
}> {
  const { supabase, user } = await getAuthenticatedUser();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return { error: `Unable to mark notifications read: ${error.message}` };

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
