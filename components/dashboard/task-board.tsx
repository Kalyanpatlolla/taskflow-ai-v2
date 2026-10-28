"use client";

import {
  createTask,
  deleteTask,
  updateTask,
  updateTaskStatus,
  type TaskPriority,
  type TaskStatus,
} from "@/app/dashboard/projects/[id]/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Check,
  CircleAlert,
  ListFilter,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

export type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
};

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: "todo", label: "To Do", color: "bg-slate-400" },
  { status: "in_progress", label: "In Progress", color: "bg-sky-500" },
  { status: "review", label: "Review", color: "bg-amber-500" },
  { status: "done", label: "Done", color: "bg-emerald-500" },
];

const priorities: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function TaskBoard({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskRecord[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const completed = tasks.filter((task) => task.status === "done").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const normalizedSearch = search.trim().toLocaleLowerCase();

  const matchingTasks = tasks.filter((task) => {
    const matchesTitle = task.title.toLocaleLowerCase().includes(normalizedSearch);
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesTitle && matchesPriority && matchesStatus;
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingTask(null);
  }

  function openCreateDialog() {
    setNotice("");
    setEditingTask(null);
    setDialogOpen(true);
  }

  function openEditDialog(task: TaskRecord) {
    setNotice("");
    setEditingTask(task);
    setDialogOpen(true);
  }

  function handleSaved() {
    closeDialog();
    setNotice(editingTask ? "Task updated." : "Task created.");
  }

  return (
    <div>
      <section className="dashboard-card mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Task progress</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {completed}{" "}
              <span className="text-base font-medium text-slate-400 dark:text-slate-500">
                of {tasks.length} complete
              </span>
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <div className="mb-2 flex justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Overall progress</span>
              <span>{progress}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Task completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={openCreateDialog}
            className="h-10 shrink-0 rounded-xl bg-[#6554F5] px-4 font-medium shadow-sm shadow-violet-500/20 hover:bg-[#5846E7]"
          >
            <Plus aria-hidden="true" size={16} />
            Add task
          </Button>
        </div>
      </section>

      {notice && (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <Check aria-hidden="true" size={16} />
          {notice}
        </p>
      )}

      <section
        aria-label="Task search and filters"
        className="dashboard-card mb-5 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_180px_180px]"
      >
        <div className="relative">
          <Search
            aria-hidden="true"
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            aria-label="Search tasks by title"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search task titles..."
            className="h-10 rounded-xl border-slate-200 pl-9"
          />
        </div>
        <div className="relative">
          <ListFilter
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All priorities</option>
            {priorities.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label} priority
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <ListFilter
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All statuses</option>
            {columns.map((column) => (
              <option key={column.status} value={column.status}>
                {column.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {tasks.length === 0 ? (
        <section className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Plus aria-hidden="true" size={21} />
          </span>
          <h2 className="mt-4 text-sm font-semibold text-slate-800 dark:text-slate-200">
            No tasks yet
          </h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
            Add the first task to start tracking progress on this project.
          </p>
          <Button
            type="button"
            onClick={openCreateDialog}
            className="mt-5 h-10 rounded-xl bg-[#6554F5] px-4 font-medium hover:bg-[#5846E7]"
          >
            <Plus aria-hidden="true" size={16} />
            Add task
          </Button>
        </section>
      ) : matchingTasks.length === 0 ? (
        <section className="dashboard-card px-6 py-12 text-center">
          <CircleAlert
            aria-hidden="true"
            size={22}
            className="mx-auto text-slate-400"
          />
          <h2 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            No matching tasks
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Adjust your search or filters to see more tasks.
          </p>
        </section>
      ) : (
        <section
          aria-label="Task board"
          className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-4"
        >
          {columns.map((column) => {
            const columnTasks = matchingTasks.filter(
              (task) => task.status === column.status,
            );

            return (
              <div
                key={column.status}
                className={`min-w-0 rounded-2xl border p-3 transition-colors ${
                  column.status === "in_progress"
                    ? "border-blue-100 bg-blue-50/60 dark:border-blue-950 dark:bg-blue-950/20"
                    : column.status === "review"
                      ? "border-amber-100 bg-amber-50/60 dark:border-amber-950 dark:bg-amber-950/20"
                      : column.status === "done"
                        ? "border-emerald-100 bg-emerald-50/60 dark:border-emerald-950 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/70"
                }`}
              >
                <header className="mb-3 flex items-center justify-between px-1 py-1">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <span
                      className={cn("size-2 rounded-full", column.color)}
                      aria-hidden="true"
                    />
                    {column.label}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                    {columnTasks.length}
                  </span>
                </header>
                <div className="space-y-3">
                  {columnTasks.length ? (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        projectId={projectId}
                        task={task}
                        onEdit={() => openEditDialog(task)}
                      />
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/60">
                      No tasks in this column
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {dialogOpen && (
        <TaskDialog
          key={editingTask?.id ?? "new"}
          projectId={projectId}
          task={editingTask}
          onClose={closeDialog}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function TaskDialog({
  projectId,
  task,
  onClose,
  onSaved,
}: {
  projectId: string;
  task: TaskRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = task ? updateTask.bind(null, projectId) : createTask.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(action, {});
  const router = useRouter();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (state.success) {
      onSaved();
      router.refresh();
    }
  }, [onSaved, router, state.success]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="task-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:px-6">
        <div>
          <h2
            id="task-dialog-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {task ? "Edit task" : "Add a task"}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {task ? "Update this task's details." : "Add a task to this project."}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={isPending}
          className="-mr-2 -mt-2 shrink-0 rounded-lg text-slate-500"
        >
          <X aria-hidden="true" size={18} />
        </Button>
      </div>
      <form action={formAction} className="space-y-4 p-5 sm:p-6">
        {task && <input type="hidden" name="task_id" value={task.id} />}
        <div className="space-y-2">
          <Label htmlFor="task-title" className="text-slate-700">
            Task title
          </Label>
          <Input
            id="task-title"
            name="title"
            required
            maxLength={160}
            autoFocus
            defaultValue={task?.title ?? ""}
            placeholder="e.g. Draft project brief"
            className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-description" className="text-slate-700">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <textarea
            id="task-description"
            name="description"
            maxLength={2000}
            rows={3}
            defaultValue={task?.description ?? ""}
            placeholder="Add helpful details..."
            className="flex w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="task-priority" className="text-slate-700">
              Priority
            </Label>
            <select
              id="task-priority"
              name="priority"
              required
              defaultValue={task?.priority ?? "medium"}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-950"
            >
              {priorities.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due-date" className="text-slate-700">
              Deadline <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="task-due-date"
              name="due_date"
              type="date"
              defaultValue={task?.due_date ?? ""}
              className="h-11 rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="h-10 rounded-xl border-slate-200 px-4 dark:border-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="h-10 rounded-xl bg-[#6554F5] px-4 font-medium hover:bg-[#5846E7]"
          >
            {isPending ? "Saving..." : task ? "Save task" : "Create task"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

function TaskCard({
  projectId,
  task,
  onEdit,
}: {
  projectId: string;
  task: TaskRecord;
  onEdit: () => void;
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function changeStatus(status: string) {
    setError("");
    startTransition(async () => {
      const result = await updateTaskStatus(projectId, task.id, status);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await deleteTask(projectId, task.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const priorityClass = {
    low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    medium: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    high: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  }[task.priority];

  return (
    <article
      id={`task-${task.id}`}
      className="group rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm shadow-slate-200/30 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/10 dark:hover:border-violet-900"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="break-words text-sm font-semibold leading-5 text-slate-800 dark:text-slate-200">
          {task.title}
        </h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            priorityClass,
          )}
        >
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500 dark:text-slate-400">
          {task.description}
        </p>
      )}
      {task.due_date && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <CalendarDays aria-hidden="true" size={13} />
          Due {dateFormatter.format(new Date(`${task.due_date}T00:00:00.000Z`))}
        </p>
      )}
      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Label htmlFor={`status-${task.id}`} className="sr-only">
          Change status for {task.title}
        </Label>
        <select
          id={`status-${task.id}`}
          value={task.status}
          disabled={isPending}
          onChange={(event) => changeStatus(event.target.value)}
          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
        >
          {columns.map((column) => (
            <option key={column.status} value={column.status}>
              Move to {column.label}
            </option>
          ))}
        </select>
        <div className="mt-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEdit}
            disabled={isPending}
            className="h-7 px-2 text-xs text-slate-500 dark:text-slate-400"
          >
            <Pencil aria-hidden="true" size={13} />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
