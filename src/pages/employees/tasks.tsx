import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FolderKanban,
  Loader2,
  Search,
} from "lucide-react";
import {
  getTasks,
  startTask,
  submitTask,
  toggleSubtask,
} from "../../services/taskService";
import type { Task, TaskPriority, TaskStatus } from "../../types/task";

const statusFilters: Array<{ value: "all" | TaskStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Waiting for Review" },
  { value: "completed", label: "Approved" },
];

const statusMeta: Record<TaskStatus, { label: string; badge: string; dot: string; bar: string }> = {
  not_started: { label: "Not Started", badge: "bg-slate-100 text-slate-500", dot: "bg-slate-400", bar: "bg-slate-400" },
  in_progress: { label: "In Progress", badge: "bg-amber-50 text-amber-600", dot: "bg-amber-500", bar: "bg-amber-500" },
  submitted: { label: "Waiting for Review", badge: "bg-blue-50 text-blue-600", dot: "bg-blue-500", bar: "bg-blue-500" },
  completed: { label: "Approved", badge: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500", bar: "bg-emerald-500" },
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-amber-50 text-amber-600",
  high: "bg-red-50 text-red-600",
  urgent: "bg-red-100 text-red-700",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const EmployeeTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const data = await getTasks();
      if (cancelled) return;
      setTasks(data);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const applyUpdatedTask = (updated: Task) => {
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
  };

  const runAction = async (taskId: number, action: () => Promise<Task>) => {
    setError(null);
    setBusyTaskId(taskId);
    try {
      const updated = await action();
      applyUpdatedTask(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusyTaskId(null);
    }
  };

  const handleStart = (task: Task) => runAction(task.id, () => startTask(task.id));
  const handleSubmit = (task: Task) => runAction(task.id, () => submitTask(task.id));
  const handleToggleSubtask = (task: Task, subtaskId: number) =>
    runAction(task.id, () => toggleSubtask(task.id, subtaskId));

  const projects = useMemo(() => {
    const map = new Map<number, string>();
    for (const task of tasks) {
      if (task.projectId != null) map.set(task.projectId, task.projectName ?? "Untitled Project");
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (projectFilter !== "all" && String(task.projectId) !== projectFilter) return false;
      if (!term) return true;

      return (
        task.title.toLowerCase().includes(term) ||
        task.description.toLowerCase().includes(term)
      );
    });
  }, [tasks, search, projectFilter, statusFilter]);

  const groupedByProject = useMemo(() => {
    const map = new Map<number, Task[]>();

    for (const task of filteredTasks) {
      const key = task.projectId ?? 0;
      const bucket = map.get(key) ?? [];
      bucket.push(task);
      map.set(key, bucket);
    }

    for (const bucket of map.values()) {
      bucket.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    return projects
      .map((project) => ({ project, tasks: map.get(project.id) ?? [] }))
      .filter((group) => group.tasks.length > 0);
  }, [projects, filteredTasks]);

  const totalTasks = tasks.length;
  const notStartedCount = tasks.filter((task) => task.status === "not_started").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const submittedCount = tasks.filter((task) => task.status === "submitted").length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;

  const toggleProject = (projectId: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      const key = String(projectId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          My Tasks
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Tasks assigned to you by your manager or admin, grouped by project
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total" value={totalTasks} color="text-slate-900" />
        <StatCard label="Not Started" value={notStartedCount} color="text-slate-500" dot="bg-slate-400" />
        <StatCard label="In Progress" value={inProgressCount} color="text-amber-600" dot="bg-amber-500" />
        <StatCard label="Waiting Review" value={submittedCount} color="text-blue-600" dot="bg-blue-500" />
        <StatCard label="Approved" value={completedCount} color="text-emerald-600" dot="bg-emerald-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === filter.value
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grouped Task Lists */}
      {groupedByProject.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <ClipboardList size={26} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            {totalTasks === 0 ? "No tasks assigned yet" : "No tasks match your filters"}
          </p>
        </div>
      )}

      {groupedByProject.length > 0 && (
        <div className="space-y-4">
          {groupedByProject.map(({ project, tasks: projectTasks }) => {
            const isCollapsed = collapsed.has(String(project.id));

            return (
              <div
                key={project.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => toggleProject(project.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded-lg bg-violet-50 p-2 text-violet-600">
                      <FolderKanban size={18} />
                    </div>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {project.name}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      {projectTasks.length} {projectTasks.length === 1 ? "task" : "tasks"}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                    />
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {projectTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        busy={busyTaskId === task.id}
                        onStart={() => handleStart(task)}
                        onSubmit={() => handleSubmit(task)}
                        onToggleSubtask={(subtaskId) => handleToggleSubtask(task, subtaskId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  busy: boolean;
  onStart: () => void;
  onSubmit: () => void;
  onToggleSubtask: (subtaskId: number) => void;
}

const TaskCard = ({ task, busy, onStart, onSubmit, onToggleSubtask }: TaskCardProps) => {
  const status = statusMeta[task.status];
  const completedSubtasks = task.subtasks.filter((subtask) => subtask.status === "completed").length;

  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">{task.title}</p>
          {task.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>
          )}
          {task.dueDate && (
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
              <Calendar size={12} />
              Due {task.dueDate}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[task.priority]}`}>
            {priorityLabels[task.priority]}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span className="font-medium text-slate-700">{task.progress}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${status.bar}`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* Sub-tasks checklist */}
      {task.subtasks.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">
            Sub-tasks ({completedSubtasks}/{task.subtasks.length})
          </p>
          {task.subtasks.map((subtask) => (
            <label
              key={subtask.id}
              className={`flex items-center gap-2 text-sm ${
                task.status === "in_progress" ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={subtask.status === "completed"}
                disabled={task.status !== "in_progress" || busy}
                onChange={() => onToggleSubtask(subtask.id)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className={subtask.status === "completed" ? "text-slate-400 line-through" : "text-slate-700"}>
                {subtask.title}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Actions / status messaging */}
      {task.status === "not_started" && (
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Starting..." : "Start"}
        </button>
      )}

      {task.status === "in_progress" && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Submitting..." : "Submit for Review"}
        </button>
      )}

      {task.status === "submitted" && (
        <p className="text-xs font-medium text-blue-600">
          Submitted — waiting for your manager to review and approve.
        </p>
      )}

      {task.status === "completed" && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={16} />
          Well done! Approved{task.approvedBy ? ` by ${task.approvedBy.name}` : ""}.
        </div>
      )}
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  dot?: string;
}

const StatCard = ({ label, value, color, dot }: StatCardProps) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex items-center gap-2">
      {dot && <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />}
      <p className="text-xs text-slate-500">{label}</p>
    </div>
    <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
  </div>
);

export default EmployeeTasks;
