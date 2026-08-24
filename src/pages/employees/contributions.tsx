import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { getTasks } from "../../services/taskService";
import type { Task, TaskPriority, TaskStatus } from "../../types/task";

const statusFilters: Array<{ value: "all" | TaskStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "submitted", label: "Waiting for Review" },
  { value: "completed", label: "Approved" },
];

const statusStyles: Record<TaskStatus, string> = {
  not_started: "bg-slate-100 text-slate-500",
  in_progress: "bg-amber-50 text-amber-600",
  submitted: "bg-blue-50 text-blue-600",
  completed: "bg-emerald-50 text-emerald-600",
};

const statusLabels: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Waiting for Review",
  completed: "Approved",
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

// Employees only ever see their own contributions — getTasks() is already
// scoped to the signed-in user on the backend for this role, so there's no
// employee picker here (unlike the admin/manager Contributions page).
const EmployeeContributions = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const load = async () => {
      const taskList = await getTasks();
      setTasks(taskList);
      setLoading(false);
    };

    load();
  }, []);

  // Built from the employee's own tasks (not a separate /projects call) so
  // the filter never lists projects they aren't actually working on — the
  // /projects endpoint returns every company project, unscoped.
  const projects = useMemo(() => {
    const map = new Map<number, string>();
    for (const task of tasks) {
      if (task.projectId != null) map.set(task.projectId, task.projectName ?? "Untitled Project");
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tasks
      .filter((task) => {
        if (projectFilter !== "all" && String(task.projectId) !== projectFilter) return false;
        if (statusFilter !== "all" && task.status !== statusFilter) return false;
        if (fromDate && (!task.dueDate || task.dueDate < fromDate)) return false;
        if (toDate && (!task.dueDate || task.dueDate > toDate)) return false;

        if (!term) return true;
        return task.title.toLowerCase().includes(term);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [tasks, search, projectFilter, statusFilter, fromDate, toDate]);

  const totalTasks = filteredTasks.length;
  const notStartedCount = filteredTasks.filter((task) => task.status === "not_started").length;
  const inProgressCount = filteredTasks.filter((task) => task.status === "in_progress").length;
  const submittedCount = filteredTasks.filter((task) => task.status === "submitted").length;
  const completedCount = filteredTasks.filter((task) => task.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contributions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your task activity — what's assigned, in progress, submitted for
          review, and approved.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total" value={totalTasks} color="text-slate-900" />
        <StatCard label="Not Started" value={notStartedCount} color="text-slate-500" dot="bg-slate-400" />
        <StatCard label="In Progress" value={inProgressCount} color="text-amber-600" dot="bg-amber-500" />
        <StatCard label="Waiting Review" value={submittedCount} color="text-blue-600" dot="bg-blue-500" />
        <StatCard label="Approved" value={completedCount} color="text-emerald-600" dot="bg-emerald-500" />
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by task"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

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

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Project
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Task
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Progress
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Due Date
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading contributions...
                  </td>
                </tr>
              )}

              {!loading && filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <ClipboardList size={22} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No contributions found
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredTasks.map((task) => (
                  <tr key={task.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {task.projectName ?? "-"}
                    </td>

                    <td className="max-w-[260px] px-6 py-4 text-sm text-slate-600">
                      <p className="line-clamp-1 font-medium text-slate-700">{task.title}</p>
                      {task.subtasks.length > 0 && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {task.subtasks.filter((subtask) => subtask.status === "completed").length}/
                          {task.subtasks.length} sub-tasks done
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[task.priority]}`}
                      >
                        {priorityLabels[task.priority]}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[task.status]}`}
                      >
                        {statusLabels[task.status]}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600">{task.progress}%</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {task.dueDate ?? "-"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
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

export default EmployeeContributions;
