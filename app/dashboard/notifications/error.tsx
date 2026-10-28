"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function NotificationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Notifications page failed to load:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle aria-hidden="true" size={22} />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">
        Notifications couldn&apos;t load
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Please try again. If this keeps happening, check that the notifications
        database migration has been applied.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button type="button" onClick={reset} className="rounded-xl">
          <RotateCw aria-hidden="true" size={15} />
          Try again
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
