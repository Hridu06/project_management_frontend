import { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Loader2,
  Users,
  ChartBar,
  ClipboardList,
  CheckCircle2,
  ListChecks,
  Clock,
  AlertCircle,
} from "lucide-react";
import { getEmployees } from "../../services/employeeService";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import type { Employee } from "../../types/employee";
import type { Project } from "../../types/project";
import type { Task, TaskPriority, TaskStatus } from "../../types/task";

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

const Dashboard = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [employeeData, projectData, taskData] = await Promise.all([
        getEmployees(),
        getProjects(),
        getTasks(),
      ]);

      if (cancelled) return;

      setEmployees(employeeData);
      setProjects(projectData);
      setTasks(taskData);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "active"),
    [employees],
  );

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active"),
    [projects],
  );

  const completedProjects = useMemo(
    () => projects.filter((project) => project.status === "completed"),
    [projects],
  );

  const notStartedCount = tasks.filter((task) => task.status === "not_started").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const submittedCount = tasks.filter((task) => task.status === "submitted").length;
  const completedCount = tasks.filter((task) => task.status === "completed").length;

  const lowPriorityCount = tasks.filter((task) => task.priority === "low").length;
  const mediumPriorityCount = tasks.filter((task) => task.priority === "medium").length;
  const highPriorityCount = tasks.filter((task) => task.priority === "high").length;
  const urgentPriorityCount = tasks.filter((task) => task.priority === "urgent").length;

  // Project Statistics
  const projectStats = useMemo(() => {
    return activeProjects.map((project) => {
      const projectTasks = tasks.filter((task) => task.projectId === project.id);

      const uniqueAssignees = new Set(
        projectTasks.map((task) => task.assignedTo?.id).filter((id) => id != null),
      );

      const completedTasks = projectTasks.filter(
        (task) => task.status === "completed",
      ).length;

      const avgProgress = projectTasks.length
        ? Math.round(
            projectTasks.reduce((total, task) => total + task.progress, 0) /
              projectTasks.length,
          )
        : 0;

      return {
        ...project,
        totalContributors: uniqueAssignees.size,
        totalTasks: projectTasks.length,
        completedTasks,
        avgProgress,
      };
    });
  }, [activeProjects, tasks]);

  const recentTasks = useMemo(
    () => [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [tasks],
  );

  // Filter recent tasks by selected project
  const filteredTasks = useMemo(() => {
    if (selectedProject === "all") return recentTasks;
    return recentTasks.filter((task) => String(task.projectId) === selectedProject);
  }, [recentTasks, selectedProject]);

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
          Project Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Overview of all projects, team performance, and task activity
        </p>
      </div>

      {/* Summary Cards - Project Focused */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Active Projects"
          value={String(activeProjects.length)}
          subtitle={`${completedProjects.length} completed`}
          icon={<FolderKanban size={22} />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />

        <SummaryCard
          title="Team Members"
          value={String(activeEmployees.length)}
          subtitle={`${employees.length - activeEmployees.length} inactive`}
          icon={<Users size={22} />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <SummaryCard
          title="Total Tasks"
          value={String(tasks.length)}
          subtitle={`${completedCount} completed`}
          icon={<ClipboardList size={22} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        <SummaryCard
          title="Completed Tasks"
          value={String(completedCount)}
          subtitle={
            tasks.length > 0
              ? `${((completedCount / tasks.length) * 100).toFixed(1)}% completion rate`
              : "No tasks yet"
          }
          icon={<CheckCircle2 size={22} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Project Progress & Task Status Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Project Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Project Progress
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Active projects and their task completion
              </p>
            </div>
            <ChartBar size={21} className="shrink-0 text-slate-400" />
          </div>

          <div className="mt-6 space-y-4">
            {projectStats.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No active projects
              </div>
            )}
            {projectStats.slice(0, 4).map((project) => (
              <div key={project.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-slate-800 truncate">
                      {project.name}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      {project.totalContributors} members
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 shrink-0 ml-2">
                    {project.completedTasks}/{project.totalTasks} done
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${project.avgProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{project.totalTasks} tasks</span>
                  <span>{project.avgProgress}% progress</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Status Overview */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Task Status
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Across all projects
              </p>
            </div>
            <ListChecks size={21} className="shrink-0 text-slate-400" />
          </div>

          <div className="mt-6 space-y-3">
            <StatusItem
              label="Not Started"
              value={String(notStartedCount)}
              color="bg-slate-400"
            />
            <StatusItem
              label="In Progress"
              value={String(inProgressCount)}
              color="bg-amber-500"
            />
            <StatusItem
              label="Waiting for Review"
              value={String(submittedCount)}
              color="bg-blue-500"
            />
            <StatusItem
              label="Approved"
              value={String(completedCount)}
              color="bg-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Row - Priority Breakdown */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickStat
          icon={<CheckCircle2 className="text-emerald-500" size={18} />}
          label="Low Priority"
          value={String(lowPriorityCount)}
          color="emerald"
        />
        <QuickStat
          icon={<Clock className="text-amber-500" size={18} />}
          label="Medium Priority"
          value={String(mediumPriorityCount)}
          color="amber"
        />
        <QuickStat
          icon={<AlertCircle className="text-orange-500" size={18} />}
          label="High Priority"
          value={String(highPriorityCount)}
          color="orange"
        />
        <QuickStat
          icon={<AlertCircle className="text-red-500" size={18} />}
          label="Urgent Priority"
          value={String(urgentPriorityCount)}
          color="red"
        />
      </div>

      {/* Recent Activity with Project Filter */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recent Contributions
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest task activity
              </p>
            </div>

            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredTasks.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-slate-400">
            No recent contributions found.
          </div>
        )}

        {/* Mobile card list */}
        {filteredTasks.length > 0 && (
          <div className="divide-y divide-slate-100 md:hidden">
            {filteredTasks.map((task) => (
              <ActivityCard
                key={task.id}
                employee={task.assignedTo?.name || "Unassigned"}
                initial={(task.assignedTo?.name || "?").charAt(0).toUpperCase()}
                project={task.projectName || "Unknown"}
                task={task.title}
                priority={task.priority}
                status={task.status}
                progress={task.progress}
              />
            ))}
          </div>
        )}

        {/* Desktop table */}
        {filteredTasks.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Employee
                  </th>
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
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => (
                  <ActivityRow
                    key={task.id}
                    employee={task.assignedTo?.name || "Unassigned"}
                    initial={(task.assignedTo?.name || "?").charAt(0).toUpperCase()}
                    project={task.projectName || "Unknown"}
                    task={task.title}
                    priority={task.priority}
                    status={task.status}
                    progress={task.progress}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Component Interfaces
interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

interface StatusItemProps {
  label: string;
  value: string;
  color: string;
}

interface QuickStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

interface ActivityRowProps {
  employee: string;
  initial: string;
  project: string;
  task: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
}

// Component Definitions
const SummaryCard = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
}: SummaryCardProps) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`shrink-0 rounded-lg p-2.5 ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const StatusItem = ({ label, value, color }: StatusItemProps) => {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
};

const QuickStat = ({ icon, label, value, color }: QuickStatProps) => {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className={`rounded-lg p-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-base font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const ActivityCard = ({
  employee,
  initial,
  project,
  task,
  priority,
  status,
  progress,
}: ActivityRowProps) => {
  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
            {initial}
          </div>
          <span className="truncate text-sm font-medium text-slate-800">
            {employee}
          </span>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-400">Project</dt>
          <dd className="mt-0.5 truncate text-slate-600">{project}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Priority</dt>
          <dd className="mt-0.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyles[priority]}`}
            >
              {priorityLabels[priority]}
            </span>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-slate-400">Task</dt>
          <dd className="mt-0.5 text-slate-600">{task}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-slate-400">Progress</dt>
          <dd className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-600">{progress}%</span>
          </dd>
        </div>
      </dl>
    </div>
  );
};

const ActivityRow = ({
  employee,
  initial,
  project,
  task,
  priority,
  status,
  progress,
}: ActivityRowProps) => {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
            {initial}
          </div>
          <span className="text-sm font-medium text-slate-800">{employee}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600">{project}</td>
      <td className="px-6 py-4 text-sm text-slate-600">{task}</td>
      <td className="px-6 py-4">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[priority]}`}
        >
          {priorityLabels[priority]}
        </span>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
        >
          {statusLabels[status]}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600">{progress}%</span>
        </div>
      </td>
    </tr>
  );
};

export default Dashboard;
