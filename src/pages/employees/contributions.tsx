import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Printer, Search } from "lucide-react";
import { getTasks } from "../../services/taskService";
import { useAuth } from "../../context/AuthContext";
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

// Print-specific styles
const printStyles = `
  @media print {
    body {
      background: white !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    .print-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 10px 0 10px 0 !important;
      border-bottom: 2px solid #4f46e5 !important;
      margin-bottom: 14px !important;
    }

    .print-header-left {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }

    .print-logo {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 32px !important;
      height: 32px !important;
      background: #4f46e5 !important;
      border-radius: 9px !important;
      color: white !important;
      font-weight: 700 !important;
      font-size: 15px !important;
    }

    .print-title {
      font-size: 17px !important;
      font-weight: 700 !important;
      color: #0f172a !important;
      margin: 0 !important;
    }

    .print-subtitle {
      font-size: 10px !important;
      color: #64748b !important;
      margin: 2px 0 0 0 !important;
    }

    .print-meta {
      text-align: right !important;
      font-size: 10px !important;
      color: #475569 !important;
    }

    .print-meta span {
      display: block !important;
      line-height: 1.5 !important;
    }

    .print-meta .label {
      color: #94a3b8 !important;
      font-size: 9px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }

    /* Employee info card */
    .print-employee {
      display: flex !important;
      gap: 24px !important;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 10px !important;
      padding: 10px 16px !important;
      margin-bottom: 16px !important;
    }

    .print-employee-field .label {
      display: block !important;
      color: #94a3b8 !important;
      font-size: 9px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
      margin-bottom: 2px !important;
    }

    .print-employee-field .value {
      display: block !important;
      color: #0f172a !important;
      font-size: 11px !important;
      font-weight: 600 !important;
    }

    /* Table styles */
    .print-table-container {
      margin-top: 6px !important;
      page-break-inside: avoid !important;
    }

    .print-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 10px !important;
    }

    .print-table thead th {
      background: #f1f5f9 !important;
      color: #0f172a !important;
      font-weight: 600 !important;
      text-align: left !important;
      padding: 7px 10px !important;
      border-bottom: 2px solid #e2e8f0 !important;
      font-size: 9px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
    }

    .print-table tbody td {
      padding: 6px 10px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      color: #1e293b !important;
    }

    .print-table tbody tr:last-child td {
      border-bottom: none !important;
    }

    .print-status-badge {
      display: inline-block !important;
      padding: 2px 8px !important;
      border-radius: 20px !important;
      font-size: 9px !important;
      font-weight: 500 !important;
    }

    .print-status-badge.not_started {
      background: #f1f5f9 !important;
      color: #64748b !important;
    }

    .print-status-badge.in_progress {
      background: #fef3c7 !important;
      color: #92400e !important;
    }

    .print-status-badge.submitted {
      background: #dbeafe !important;
      color: #1e40af !important;
    }

    .print-status-badge.completed {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }

    .print-priority-badge {
      display: inline-block !important;
      padding: 2px 8px !important;
      border-radius: 20px !important;
      font-size: 9px !important;
      font-weight: 500 !important;
    }

    .print-priority-badge.low {
      background: #f1f5f9 !important;
      color: #64748b !important;
    }

    .print-priority-badge.medium {
      background: #fef3c7 !important;
      color: #92400e !important;
    }

    .print-priority-badge.high {
      background: #fee2e2 !important;
      color: #b91c1c !important;
    }

    .print-priority-badge.urgent {
      background: #fecaca !important;
      color: #991b1b !important;
    }

    .print-footer {
      margin-top: 16px !important;
      padding-top: 10px !important;
      border-top: 2px solid #e2e8f0 !important;
      display: flex !important;
      justify-content: space-between !important;
      font-size: 9px !important;
      color: #94a3b8 !important;
    }

    @page {
      margin: 12mm 14mm !important;
    }
  }
`;

// Employees only ever see their own contributions — getTasks() is already
// scoped to the signed-in user on the backend for this role, so there's no
// employee picker here (unlike the admin/manager Contributions page).
const EmployeeContributions = () => {
  const { user } = useAuth();
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

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print Styles */}
      <style>{printStyles}</style>

      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contributions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Your task activity — what's assigned, in progress, submitted for
            review, and approved.
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block print-header">
        <div className="print-header-left">
          <div className="print-logo">logo</div>
          <div>
            <h1 className="print-title">Contributions Report</h1>
            <p className="print-subtitle">Employee task activity summary</p>
          </div>
        </div>
        <div className="print-meta">
          <span className="label">Generated</span>
          <span>{new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>
          <span>{new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>
      </div>

      {/* Print-only employee info */}
      <div className="hidden print:block print-employee">
        <div className="print-employee-field">
          <span className="label">Name</span>
          <span className="value">{user?.name ?? "-"}</span>
        </div>
        <div className="print-employee-field">
          <span className="label">Role</span>
          <span className="value">{user?.role ?? "-"}</span>
        </div>
        <div className="print-employee-field">
          <span className="label">Email</span>
          <span className="value">{user?.email ?? "-"}</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 print:hidden">
        <StatCard label="Total" value={totalTasks} color="text-slate-900" />
        <StatCard label="Not Started" value={notStartedCount} color="text-slate-500" dot="bg-slate-400" />
        <StatCard label="In Progress" value={inProgressCount} color="text-amber-600" dot="bg-amber-500" />
        <StatCard label="Waiting Review" value={submittedCount} color="text-blue-600" dot="bg-blue-500" />
        <StatCard label="Approved" value={completedCount} color="text-emerald-600" dot="bg-emerald-500" />
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
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
      <div className="rounded-xl border border-slate-200 bg-white print:hidden">
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

      {/* Printable table (print only) */}
      {!loading && filteredTasks.length > 0 && (
        <div className="hidden print:block print-table-container">
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Project</th>
                <th style={{ width: '24%' }}>Task</th>
                <th style={{ width: '12%' }}>Priority</th>
                <th style={{ width: '14%' }}>Status</th>
                <th style={{ width: '14%' }}>Progress</th>
                <th style={{ width: '18%' }}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.projectName ?? "-"}</td>
                  <td>
                    <strong>{task.title}</strong>
                    {task.subtasks.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {task.subtasks.filter((subtask) => subtask.status === "completed").length}/
                        {task.subtasks.length} sub-tasks done
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`print-priority-badge ${task.priority}`}>
                      {priorityLabels[task.priority]}
                    </span>
                  </td>
                  <td>
                    <span className={`print-status-badge ${task.status}`}>
                      {statusLabels[task.status]}
                    </span>
                  </td>
                  <td>{task.progress}%</td>
                  <td>{task.dueDate ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Print Footer */}
          <div className="print-footer">
            <span>© {new Date().getFullYear()} — Project Management System</span>
            <span>{totalTasks} task{totalTasks === 1 ? "" : "s"}</span>
          </div>
        </div>
      )}
      </div>
    </>
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
