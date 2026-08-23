import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Clock3,
  ClipboardList,
  FolderKanban,
  Loader2,
  Search,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getProjects } from "../../services/projectService";
import { getContributions } from "../../services/contributionService";
import { formatDuration } from "../../services/attendanceService";
import type { Project, ProjectStatus } from "../../types/project";
import type {
  Contribution,
  ContributionPriority,
  ContributionStatus,
  ContributionType,
} from "../../types/attendance";

const projectStatusStyles: Record<ProjectStatus, string> = {
  active: "bg-emerald-50 text-emerald-600",
  on_hold: "bg-amber-50 text-amber-600",
  completed: "bg-slate-100 text-slate-500",
  archived: "bg-slate-100 text-slate-400",
};

const statusFilters: Array<{ value: "all" | ContributionStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const statusStyles: Record<ContributionStatus, { badge: string; dot: string; label: string }> = {
  completed: { badge: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500", label: "Completed" },
  "in-progress": { badge: "bg-amber-50 text-amber-600", dot: "bg-amber-500", label: "In Progress" },
  pending: { badge: "bg-slate-100 text-slate-500", dot: "bg-slate-400", label: "Pending" },
};

const typeStyles: Record<ContributionType, string> = {
  task: "bg-blue-50 text-blue-600",
  bug: "bg-red-50 text-red-600",
  feature: "bg-violet-50 text-violet-600",
  improvement: "bg-teal-50 text-teal-600",
};

const typeLabels: Record<ContributionType, string> = {
  task: "Task",
  bug: "Bug",
  feature: "Feature",
  improvement: "Improvement",
};

const priorityStyles: Record<ContributionPriority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-amber-50 text-amber-600",
  high: "bg-red-50 text-red-600",
};

const priorityLabels: Record<ContributionPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const getTitle = (contribution: Contribution): string =>
  contribution.title?.trim() || contribution.task;

const getType = (contribution: Contribution): ContributionType =>
  contribution.type ?? "task";

const getPriority = (contribution: Contribution): ContributionPriority =>
  contribution.priority ?? "medium";

const durationMinutes = (contribution: Contribution) => {
  const [startHour, startMinute] = contribution.startTime.split(":").map(Number);
  const [endHour, endMinute] = contribution.endTime.split(":").map(Number);
  return Math.max(endHour * 60 + endMinute - (startHour * 60 + startMinute), 0);
};

const EmployeeTasks = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId != null ? String(user.employeeId) : null;

  const [projects, setProjects] = useState<Project[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ContributionStatus>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [projectData, contributionData] = await Promise.all([
        getProjects(),
        getContributions(),
      ]);

      if (cancelled) return;

      setProjects(projectData);
      setContributions(contributionData);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const myTasks = useMemo(
    () =>
      employeeId
        ? contributions.filter((contribution) => contribution.employeeId === employeeId)
        : [],
    [contributions, employeeId],
  );

  const myProjects = useMemo(() => {
    const projectIds = new Set(myTasks.map((task) => task.projectId));
    return projects.filter((project) => projectIds.has(String(project.id)));
  }, [projects, myTasks]);

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return myTasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (projectFilter !== "all" && task.projectId !== projectFilter) return false;
      if (!term) return true;

      return (
        getTitle(task).toLowerCase().includes(term) ||
        task.task.toLowerCase().includes(term)
      );
    });
  }, [myTasks, search, projectFilter, statusFilter]);

  const groupedByProject = useMemo(() => {
    const map = new Map<string, Contribution[]>();

    for (const task of filteredTasks) {
      const bucket = map.get(task.projectId) ?? [];
      bucket.push(task);
      map.set(task.projectId, bucket);
    }

    for (const bucket of map.values()) {
      bucket.sort((a, b) => b.date.localeCompare(a.date));
    }

    return myProjects
      .map((project) => ({ project, tasks: map.get(String(project.id)) ?? [] }))
      .filter((group) => group.tasks.length > 0);
  }, [myProjects, filteredTasks]);

  const totalTasks = myTasks.length;
  const pendingCount = myTasks.filter((task) => task.status === "pending").length;
  const inProgressCount = myTasks.filter((task) => task.status === "in-progress").length;
  const completedCount = myTasks.filter((task) => task.status === "completed").length;

  const toggleProject = (projectId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
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
          Tasks assigned to you by your manager or team lead, grouped by project
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Tasks" value={totalTasks} color="text-slate-900" />
        <StatCard label="Pending" value={pendingCount} color="text-slate-500" dot="bg-slate-400" />
        <StatCard label="In Progress" value={inProgressCount} color="text-amber-600" dot="bg-amber-500" />
        <StatCard label="Completed" value={completedCount} color="text-emerald-600" dot="bg-emerald-500" />
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
            {myProjects.map((project) => (
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
      {!employeeId && (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <ClipboardList size={26} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Your account isn't linked to an employee profile yet.
          </p>
        </div>
      )}

      {employeeId && groupedByProject.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <ClipboardList size={26} className="mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            {totalTasks === 0 ? "No tasks assigned yet" : "No tasks match your filters"}
          </p>
        </div>
      )}

      {groupedByProject.length > 0 && (
        <div className="space-y-4">
          {groupedByProject.map(({ project, tasks }) => {
            const isCollapsed = collapsed.has(String(project.id));

            return (
              <div
                key={project.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => toggleProject(String(project.id))}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 rounded-lg bg-violet-50 p-2 text-violet-600">
                      <FolderKanban size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {project.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">{project.client}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-block ${projectStatusStyles[project.status]}`}
                    >
                      {project.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-400 transition-transform ${isCollapsed ? "" : "rotate-180"}`}
                    />
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {tasks.map((task) => {
                      const status = statusStyles[task.status];

                      return (
                        <div
                          key={task.id}
                          className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {getTitle(task)}
                            </p>
                            {task.title && task.task && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                {task.task}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {task.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock3 size={12} />
                                {formatDuration(durationMinutes(task))}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.badge}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                            <div className="flex gap-1.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeStyles[getType(task)]}`}
                              >
                                {typeLabels[getType(task)]}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[getPriority(task)]}`}
                              >
                                {priorityLabels[getPriority(task)]}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
