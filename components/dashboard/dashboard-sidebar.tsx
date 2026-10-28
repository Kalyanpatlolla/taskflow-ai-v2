"use client";

import {
  CheckSquare2,
  FolderKanban,
  LayoutDashboard,
  Settings2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Workspaces", href: "/dashboard/workspaces", icon: UsersRound },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Settings", href: "/dashboard/settings", icon: Settings2 },
];

export function DashboardSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r">
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6554F5] to-[#287CF5] text-white shadow-md shadow-violet-500/25">
          <CheckSquare2 aria-hidden="true" size={19} />
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">TaskFlow</span>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          AI
        </span>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:gap-1.5 md:px-4 md:py-7"
      >
        <p className="hidden px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:block">
          Workspace
        </p>
        {navigation.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-violet-50 text-violet-700 shadow-sm shadow-violet-900/5 dark:bg-violet-500/15 dark:text-violet-300"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-slate-100 p-4 dark:border-slate-800 md:block">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-blue-100 text-sm font-semibold text-violet-700 dark:from-violet-950 dark:to-blue-950 dark:text-violet-200">
            {email.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
              {email || "Signed in"}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">TaskFlow account</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
