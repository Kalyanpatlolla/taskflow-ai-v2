"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { WorkspaceCreateForm } from "./workspace-create-form";

export function CreateWorkspaceDialog({
  className,
  label = "Create workspace",
  icon = <Plus aria-hidden="true" size={16} />,
}: {
  className?: string;
  label?: string;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "h-10 rounded-xl bg-[#6554F5] px-4 font-medium shadow-sm shadow-violet-500/20 hover:bg-[#5846E7]",
          className,
        )}
      >
        {icon}
        {label}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="create-workspace-title"
        onCancel={(event) => {
          event.preventDefault();
          setIsOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setIsOpen(false);
          }
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <h2
              id="create-workspace-title"
              className="text-base font-semibold text-slate-900"
            >
              Create a workspace
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Give your workspace a name you and your team will recognize.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close dialog"
            onClick={() => setIsOpen(false)}
            className="-mr-2 -mt-2 shrink-0 rounded-lg text-slate-500"
          >
            <X aria-hidden="true" size={18} />
          </Button>
        </div>
        <div className="p-5 sm:p-6">
          <WorkspaceCreateForm onCancel={() => setIsOpen(false)} />
        </div>
      </dialog>
    </>
  );
}
