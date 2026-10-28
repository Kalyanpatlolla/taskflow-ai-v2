import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

export function DashboardPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-indigo-600">
          TaskFlow workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
      </header>
      <section className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-12 text-center shadow-sm shadow-slate-200/40">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Construction aria-hidden="true" size={21} />
        </span>
        <h2 className="mt-4 text-base font-semibold text-slate-900">
          This section is coming soon
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          {description}
        </p>
        <Button
          asChild
          variant="outline"
          className="mt-6 rounded-xl border-slate-200"
        >
          <Link href="/dashboard">
            <ArrowLeft aria-hidden="true" size={16} />
            Back to dashboard
          </Link>
        </Button>
      </section>
    </div>
  );
}
