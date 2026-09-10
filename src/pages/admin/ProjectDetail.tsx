import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Edit2,
  FileText,
  FolderKanban,
  GitFork,
  History,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Settings as SettingsIcon,
  Trash2,
  Users,
  X,
  XCircle,
  Clock,
  User,
  Calendar as CalendarIcon,
  Flag,
  CheckSquare,
  AlertCircle,
  PlayCircle,
  Clock as ClockIcon,
  CheckCircle,
  XCircle as XCircleIcon,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Circle,
  CircleCheck,
  PauseCircle,
  Play,
  Edit3,
  Sparkles,
} from "lucide-react";
import Modal from "../../components/common/Modal";
import TaskActivityModal from "../../components/tasks/TaskActivityModal";
import {
  useDeleteProjectMutation,
  useProjectAnalyticsQuery,
  useProjectsQuery,
  useUpdateProjectMutation,
} from "../../hooks/useProjectQueries";
import { useTeamsQuery } from "../../hooks/useTeamQueries";
import { getEmployees } from "../../services/employeeService";
import {
  addSubtask,
  approveTask,
  createTask,
  deleteTask,
  getTasks,
  pauseSubtask,
  rejectTask,
  updateSubtask,
  updateTask,
} from "../../services/taskService";
import { useAuth } from "../../context/AuthContext";
import type { ProjectFormInput, ProjectStatus } from "../../types/project";
import type { Employee } from "../../types/employee";
import type { UserRole } from "../../types/user";
import type { Task, TaskFormInput, TaskPriority } from "../../types/task";

const statusStyles: Record<ProjectStatus, string> = {
  active: "bg-emerald-50 text-emerald-600",
  on_hold: "bg-amber-50 text-amber-600",
  completed: "bg-slate-100 text-slate-500",
  archived: "bg-slate-100 text-slate-400",
};

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type TabId = "tasks" | "calendar" | "analytics" | "settings";

const TABS: { id: TabId; label: string; icon: typeof ListChecks }[] = [
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const taskStatusStyles: Record<Task["status"], string> = {
  not_started: "bg-slate-100 text-slate-500",
  in_progress: "bg-amber-50 text-amber-600",
  submitted: "bg-blue-50 text-blue-600",
  completed: "bg-emerald-50 text-emerald-600",
  rejected: "bg-red-50 text-red-600",
  paused: "bg-rose-50 text-rose-500",
};

const taskStatusLabels: Record<Task["status"], string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Waiting for Review",
  completed: "Approved",
  rejected: "Rejected",
  paused: "Paused",
};

const taskStatusBarColors: Record<Task["status"], string> = {
  not_started: "bg-slate-400",
  in_progress: "bg-amber-500",
  submitted: "bg-blue-500",
  completed: "bg-emerald-500",
  rejected: "bg-red-500",
  paused: "bg-rose-400",
};

const ASSIGNEE_CHART_COLORS = [
  "#3b82f6", // blue
  "#f97316", // orange
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#10b981", // emerald
  "#6366f1", // indigo
  "#ef4444", // red
];
const ASSIGNEE_CHART_OTHER_COLOR = "#94a3b8";
const ASSIGNEE_CHART_MAX_SLICES = 7;

const taskPriorityStyles: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-amber-50 text-amber-600",
  high: "bg-red-50 text-red-600",
  urgent: "bg-red-100 text-red-700",
};

const taskPriorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const taskPriorityIcon: Record<TaskPriority, typeof Flag> = {
  low: Flag,
  medium: Flag,
  high: Flag,
  urgent: AlertCircle,
};

const taskStatusIcon: Record<Task["status"], typeof ClockIcon> = {
  not_started: ClockIcon,
  in_progress: PlayCircle,
  submitted: Clock,
  completed: CheckCircle,
  rejected: XCircleIcon,
  paused: PauseCircle,
};

const emptyTaskForm = (projectId: number): TaskFormInput => ({
  projectId,
  assignedTo: 0,
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
  subtasks: [],
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface EditableSubtask {
  id: number;
  title: string;
  originalTitle: string;
  status: Task["status"];
  isEdited: boolean;
  isAddedLater: boolean;
}

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canManageProjects = isAdmin || user?.role === "manager";

  const projectsQuery = useProjectsQuery();
  const teamsQuery = useTeamsQuery();
  const updateProjectMutation = useUpdateProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();

  const teams = teamsQuery.data ?? [];
  const project = useMemo(
    () => projectsQuery.data?.find((item) => String(item.id) === projectId) ?? null,
    [projectsQuery.data, projectId],
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const loading = projectsQuery.isLoading || teamsQuery.isLoading || tasksLoading;

  const tabParam = searchParams.get("tab");
  const activeTab: TabId =
    tabParam === "tasks" ||
    tabParam === "calendar" ||
    tabParam === "analytics" ||
    (tabParam === "settings" && canManageProjects)
      ? (tabParam as TabId)
      : "tasks";

  const setActiveTab = (tab: TabId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<TaskFormInput>(emptyTaskForm(0));
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [taskActionId, setTaskActionId] = useState<number | null>(null);
  const [activityTask, setActivityTask] = useState<Task | null>(null);

  // State for expanded subtasks
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [pausingSubtaskId, setPausingSubtaskId] = useState<number | null>(null);

  // Existing sub-tasks of the task being edited: title is editable, but the
  // row can never be removed here — only paused/resumed from the task list.
  const [editableSubtasks, setEditableSubtasks] = useState<EditableSubtask[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const today = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [settingsForm, setSettingsForm] = useState<ProjectFormInput | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!projectId) return;

      setTasksLoading(true);
      const [employeeList, taskList] = await Promise.all([
        getEmployees(),
        getTasks({ projectId: Number(projectId) }),
      ]);

      setEmployees(employeeList);
      setTasks(taskList);
      setTasksLoading(false);
    };

    load();
  }, [projectId]);

  useEffect(() => {
    if (!project) return;

    setSettingsForm({
      name: project.name,
      client: project.client ?? "",
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate ?? "",
      progress: project.progress,
      pdfFile: null,
      githubLink: project.githubLink ?? "",
      teamId: project.teamId,
    });
  }, [project?.id]);

  const assignedEmployees = useMemo(() => {
    if (!project) return [];
    const memberEmails = new Set(project.members.map((member) => member.email));
    return employees.filter((employee) => memberEmails.has(employee.email));
  }, [project, employees]);

  const memberIdByEmail = useMemo(() => {
    const map = new Map<string, number>();
    for (const member of project?.members ?? []) map.set(member.email, member.id);
    return map;
  }, [project]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "completed").length;
    const inProgress = tasks.filter((task) => task.status === "in_progress").length;
    const notStarted = tasks.filter((task) => task.status === "not_started").length;
    const submitted = tasks.filter((task) => task.status === "submitted").length;
    const rejected = tasks.filter((task) => task.status === "rejected").length;

    const assigneeSummary = assignedEmployees
      .map((employee) => {
        const memberId = memberIdByEmail.get(employee.email);
        const employeeTasks =
          memberId != null ? tasks.filter((task) => task.assignedTo?.id === memberId) : [];
        return {
          id: employee.id,
          name: employee.name,
          total: employeeTasks.length,
          completed: employeeTasks.filter((task) => task.status === "completed").length,
          inProgress: employeeTasks.filter((task) => task.status === "in_progress").length,
        };
      })
      .filter((summary) => summary.total > 0)
      .sort((a, b) => b.total - a.total);

    return { total, completed, inProgress, notStarted, submitted, rejected, assigneeSummary };
  }, [tasks, assignedEmployees, memberIdByEmail]);

  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(term) ||
          task.description.toLowerCase().includes(term) ||
          (task.assignedTo?.name.toLowerCase().includes(term) ?? false),
      );
    }

    if (filterEmployee !== "all") {
      filtered = filtered.filter((task) => String(task.assignedTo?.id) === filterEmployee);
    }

    if (filterDate) {
      filtered = filtered.filter((task) => task.dueDate === filterDate);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((task) => task.status === filterStatus);
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter((task) => task.priority === filterPriority);
    }

    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [tasks, searchTerm, filterEmployee, filterDate, filterStatus, filterPriority]);

  const tasksByDueDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate);
      if (list) list.push(task);
      else map.set(task.dueDate, [task]);
    }
    return map;
  }, [tasks]);

  const calendarWeeks = useMemo(() => {
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = new Date(year, month, 1).getDay();

    const cells: (string | null)[] = Array(startOffset).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(formatDateKey(new Date(year, month, day)));
    }
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [calendarMonth]);

  const monthLabel = useMemo(
    () =>
      new Date(calendarMonth.year, calendarMonth.month, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [calendarMonth],
  );

  const todayKey = useMemo(() => formatDateKey(today), [today]);

  const goToPrevMonth = () => {
    setCalendarMonth((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 },
    );
  };

  const goToNextMonth = () => {
    setCalendarMonth((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 },
    );
  };

  const selectedDayTasks = selectedDate
    ? (tasksByDueDate.get(selectedDate) ?? []).sort((a, b) => a.title.localeCompare(b.title))
    : [];

  // Analytics tab data (status breakdown + each assignee's share of tasks)
  // is computed server-side — fetched only once that tab is opened.
  const analyticsQuery = useProjectAnalyticsQuery(
    projectId ? Number(projectId) : null,
    activeTab === "analytics",
  );

  const taskStatusBreakdown = analyticsQuery.data?.taskStatusBreakdown ?? [];

  const assigneeColorMap = useMemo(() => {
    const map = new Map<number, string>();
    assignedEmployees.forEach((employee, index) => {
      map.set(employee.id, ASSIGNEE_CHART_COLORS[index % ASSIGNEE_CHART_COLORS.length]);
    });
    return map;
  }, [assignedEmployees]);

  const assigneeChart = useMemo(() => {
    const breakdown = analyticsQuery.data?.assigneeBreakdown ?? [];
    const totalAssigned = analyticsQuery.data?.totalAssigned ?? 0;
    if (totalAssigned === 0 || breakdown.length === 0) return { slices: [], totalAssigned };

    const top = breakdown.slice(0, ASSIGNEE_CHART_MAX_SLICES);
    const rest = breakdown.slice(ASSIGNEE_CHART_MAX_SLICES);

    const slices = top.map((summary) => ({
      id: summary.id,
      name: summary.name,
      total: summary.total,
      completed: summary.completed,
      percent: summary.percent,
      color: assigneeColorMap.get(summary.id) ?? ASSIGNEE_CHART_COLORS[0],
    }));

    if (rest.length > 0) {
      const restTotal = rest.reduce((sum, s) => sum + s.total, 0);
      const restCompleted = rest.reduce((sum, s) => sum + s.completed, 0);
      const restPercent = rest.reduce((sum, s) => sum + s.percent, 0);
      slices.push({
        id: -1,
        name: `Others (${rest.length})`,
        total: restTotal,
        completed: restCompleted,
        percent: restPercent,
        color: ASSIGNEE_CHART_OTHER_COLOR,
      });
    }

    return { slices, totalAssigned };
  }, [analyticsQuery.data, assigneeColorMap]);

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => tab.id !== "settings" || canManageProjects),
    [canManageProjects],
  );

  // Toggle subtask expansion
  const toggleTaskExpansion = (taskId: number) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const openAssignTaskModal = () => {
    if (!projectId) return;
    setTaskError("");
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm(Number(projectId)));
    setSubtaskDraft("");
    setEditableSubtasks([]);
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    if (!projectId) return;
    setTaskError("");
    setEditingTaskId(task.id);
    setTaskForm({
      projectId: Number(projectId),
      assignedTo: task.assignedTo?.id ?? 0,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate ?? "",
      subtasks: [],
    });
    setSubtaskDraft("");
    setEditableSubtasks(
      task.subtasks.map((subtask) => ({
        id: subtask.id,
        title: subtask.title,
        originalTitle: subtask.title,
        status: subtask.status,
        isEdited: subtask.isEdited,
        isAddedLater: subtask.isAddedLater,
      })),
    );
    setTaskModalOpen(true);
  };

  const updateEditableSubtaskTitle = (id: number, title: string) => {
    setEditableSubtasks((prev) =>
      prev.map((subtask) => (subtask.id === id ? { ...subtask, title } : subtask)),
    );
  };

  const addSubtaskDraft = () => {
    const title = subtaskDraft.trim();
    if (!title) return;
    setTaskForm((prev) => ({ ...prev, subtasks: [...prev.subtasks, title] }));
    setSubtaskDraft("");
  };

  const removeSubtaskDraft = (index: number) => {
    setTaskForm((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index),
    }));
  };

  const handleTaskSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!taskForm.assignedTo) {
      setTaskError("Please choose an assignee.");
      return;
    }

    setTaskError("");
    setSavingTask(true);

    try {
      if (editingTaskId) {
        let updated = await updateTask(editingTaskId, {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          assignedTo: taskForm.assignedTo,
          dueDate: taskForm.dueDate,
        });

        for (const subtask of editableSubtasks) {
          const title = subtask.title.trim();
          if (!title || title === subtask.originalTitle) continue;
          updated = await updateSubtask(editingTaskId, subtask.id, title);
        }

        for (const title of taskForm.subtasks.map((t) => t.trim()).filter(Boolean)) {
          updated = await addSubtask(editingTaskId, title);
        }

        setTasks((prev) => prev.map((task) => (task.id === editingTaskId ? updated : task)));
      } else {
        const created = await createTask(taskForm);
        setTasks((prev) => [created, ...prev]);
      }

      setTaskModalOpen(false);
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : "Failed to save task.");
    } finally {
      setSavingTask(false);
    }
  };

  const handleApproveTask = async (task: Task) => {
    setTaskActionId(task.id);
    try {
      const updated = await approveTask(task.id);
      setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve task.");
    } finally {
      setTaskActionId(null);
    }
  };

  const handleRejectTask = async (task: Task) => {
    const reason = window.prompt(`Reject "${task.title}"? Add an optional reason:`);
    if (reason === null) return;

    setTaskActionId(task.id);
    try {
      const updated = await rejectTask(task.id, reason.trim() || undefined);
      setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject task.");
    } finally {
      setTaskActionId(null);
    }
  };

  const handleDeleteTask = async (task: Task) => {
    const confirmed = window.confirm(`Delete task "${task.title}"? This cannot be undone.`);
    if (!confirmed) return;

    setTaskActionId(task.id);
    try {
      await deleteTask(task.id);
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete task.");
    } finally {
      setTaskActionId(null);
    }
  };

  const handlePauseSubtask = async (task: Task, subtaskId: number) => {
    setPausingSubtaskId(subtaskId);
    try {
      const updated = await pauseSubtask(task.id, subtaskId);
      setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update sub-task.");
    } finally {
      setPausingSubtaskId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Title", "Assignee", "Priority", "Due Date", "Status", "Progress", "Description"];
    const rows = tasks.map((task) => [
      task.title,
      task.assignedTo?.name ?? "Unassigned",
      taskPriorityLabels[task.priority],
      task.dueDate ?? "",
      taskStatusLabels[task.status],
      `${task.progress}%`,
      task.description,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "project"}-tasks.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSettingsSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!project || !settingsForm) return;

    setSavingSettings(true);
    setSettingsSaved(false);

    await updateProjectMutation.mutateAsync({ id: project.id, input: settingsForm });
    setSettingsForm((prev) => (prev ? { ...prev, pdfFile: null } : prev));
    setSavingSettings(false);
    setSettingsSaved(true);
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    const confirmed = window.confirm(
      `Delete "${project.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    await deleteProjectMutation.mutateAsync(project.id);
    navigate("/app/projects");
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
        Loading project...
      </div>
    );
  }

  if (!project || !settingsForm) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/app/projects")}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Back to Projects
        </button>

        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
          Project not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/app/projects")}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Back to Projects
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <FolderKanban size={22} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {project.name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {project.client ?? "No client"} · Started {project.startDate}
              </p>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                {project.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusStyles[project.status]}`}
            >
              {statusLabels[project.status]}
            </span>
            {project.githubLink && (
              <a
                href={project.githubLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                title="GitHub repository"
              >
                <GitFork size={18} />
              </a>
            )}
            {project.pdf && (
              <a
                href={project.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-red-600"
                title="Project PDF"
              >
                <FileText size={18} />
              </a>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              title="Export CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon={<ListChecks size={18} className="text-blue-500" />}
            label="Total Tasks"
            value={String(taskStats.total)}
            bg="bg-blue-50"
          />
          <StatCard
            icon={<CheckCircle2 size={18} className="text-emerald-500" />}
            label="Completed"
            value={String(taskStats.completed)}
            bg="bg-emerald-50"
          />
          <StatCard
            icon={<Loader2 size={18} className="text-amber-500" />}
            label="In Progress"
            value={String(taskStats.inProgress)}
            bg="bg-amber-50"
          />
          <StatCard
            icon={<Users size={18} className="text-violet-500" />}
            label="Team Members"
            value={String(assignedEmployees.length)}
            bg="bg-violet-50"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 px-2">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === "tasks" && (
            <div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Assigned Employees
                  </p>
                  <span className="text-xs text-slate-400">
                    {assignedEmployees.length} members
                  </span>
                </div>

                {assignedEmployees.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">No employees assigned yet.</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assignedEmployees.map((employee) => {
                      const summary = taskStats.assigneeSummary.find((s) => s.id === employee.id);
                      return (
                        <div
                          key={employee.id}
                          className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 text-sm text-slate-700"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                          <span>
                            {employee.name}
                            <span className="text-xs text-slate-400">
                              {" "}
                              · Role: {roleLabels[employee.role]}
                            </span>
                          </span>
                          {summary && (
                            <span className="text-xs text-slate-400">
                              ({summary.completed}/{summary.total} tasks)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Tasks
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {filteredTasks.length} tasks found
                    </p>
                  </div>

                  {canManageProjects && (
                    <button
                      type="button"
                      onClick={openAssignTaskModal}
                      disabled={project.members.length === 0}
                      className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus size={18} />
                      Add Tasks
                    </button>
                  )}
                </div>

                {/* Enhanced Filters */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Status</option>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="submitted">Submitted</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                    <option value="paused">Paused</option>
                  </select>

                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>

                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Assignees</option>
                    {project.members.map((member) => (
                      <option key={member.id} value={member.id}>{member.name}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />

                  {(searchTerm || filterEmployee !== "all" || filterDate || filterStatus !== "all" || filterPriority !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterEmployee("all");
                        setFilterDate("");
                        setFilterStatus("all");
                        setFilterPriority("all");
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>

                {/* Enhanced Task List with Subtasks */}
                <div className="mt-4 space-y-4">
                  {filteredTasks.length === 0 && (
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 py-14 text-center">
                      <ClipboardCheck size={22} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        {tasks.length > 0 ? "No tasks match your filters" : "No tasks assigned yet"}
                      </p>
                    </div>
                  )}

                  {filteredTasks.map((task) => {
                    const completedSubtasks = task.subtasks.filter(
                      (subtask) => subtask.status === "completed",
                    ).length;
                    const isBusy = taskActionId === task.id;
                    const StatusIcon = taskStatusIcon[task.status];
                    const PriorityIcon = taskPriorityIcon[task.priority];
                    const isExpanded = expandedTasks.has(task.id);
                    const hasSubtasks = task.subtasks.length > 0;

                    return (
                      <div
                        key={task.id}
                        className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md hover:border-blue-200"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              {/* Expand/Collapse Button for Subtasks */}
                              {hasSubtasks && (
                                <button
                                  type="button"
                                  onClick={() => toggleTaskExpansion(task.id)}
                                  className="flex items-center justify-center rounded-lg p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                  aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                                >
                                  {isExpanded ? (
                                    <ChevronDown size={16} />
                                  ) : (
                                    <ChevronRightIcon size={16} />
                                  )}
                                </button>
                              )}

                              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                                {task.title}
                              </h3>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${taskPriorityStyles[task.priority]}`}
                              >
                                <PriorityIcon size={12} />
                                {taskPriorityLabels[task.priority]}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${taskStatusStyles[task.status]}`}
                              >
                                <StatusIcon size={12} />
                                {taskStatusLabels[task.status]}
                              </span>
                            </div>

                            {task.description && (
                              <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                                {task.description}
                              </p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <User size={13} />
                                <span>{task.assignedTo?.name ?? "Unassigned"}</span>
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1.5">
                                  <CalendarIcon size={13} />
                                  <span>Due {task.dueDate}</span>
                                </div>
                              )}
                              {task.createdBy && (
                                <span>Created by {task.createdBy.name}</span>
                              )}
                              {task.subtasks.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <CheckSquare size={13} />
                                  <span>
                                    {completedSubtasks}/{task.subtasks.length} sub-tasks
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Subtasks List - Collapsible */}
                            {hasSubtasks && isExpanded && (
                              <div className="mt-3 border-t border-slate-100 pt-3">
                                <p className="text-xs font-medium text-slate-600 mb-2">
                                  Sub-tasks ({completedSubtasks}/{task.subtasks.length} done)
                                </p>
                                <div className="space-y-1.5">
                                  {task.subtasks.map((subtask) => {
                                    const isPaused = subtask.status === "paused";
                                    const isCompleted = subtask.status === "completed";
                                    const isPausing = pausingSubtaskId === subtask.id;

                                    return (
                                      <div
                                        key={subtask.id}
                                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                                          isPaused ? "bg-rose-50/60 hover:bg-rose-50" : "hover:bg-slate-50"
                                        }`}
                                      >
                                        {isCompleted ? (
                                          <CircleCheck size={14} className="text-emerald-500" />
                                        ) : isPaused ? (
                                          <PauseCircle size={14} className="text-rose-400" />
                                        ) : (
                                          <Circle size={14} className="text-slate-300" />
                                        )}
                                        <span
                                          className={`text-sm ${
                                            isCompleted
                                              ? "text-slate-400 line-through"
                                              : isPaused
                                                ? "text-rose-500"
                                                : "text-slate-700"
                                          }`}
                                        >
                                          {subtask.title}
                                        </span>

                                        {subtask.isEdited && (
                                          <span
                                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600"
                                            title="This sub-task was edited after it was created"
                                          >
                                            <Edit3 size={10} />
                                            Edited
                                          </span>
                                        )}
                                        {subtask.isAddedLater && (
                                          <span
                                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600"
                                            title="This sub-task was added after the task was assigned"
                                          >
                                            <Sparkles size={10} />
                                            New
                                          </span>
                                        )}

                                        <span
                                          className={`ml-auto text-xs ${
                                            isCompleted
                                              ? "text-emerald-500"
                                              : isPaused
                                                ? "text-rose-500"
                                                : "text-slate-400"
                                          }`}
                                        >
                                          {isCompleted ? "Done" : isPaused ? "Paused" : "Pending"}
                                        </span>

                                        {canManageProjects && !isCompleted && (
                                          <button
                                            type="button"
                                            onClick={() => handlePauseSubtask(task, subtask.id)}
                                            disabled={isPausing}
                                            className={`shrink-0 rounded-md p-1 transition-colors disabled:opacity-50 ${
                                              isPaused
                                                ? "text-rose-500 hover:bg-rose-100"
                                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                            }`}
                                            title={isPaused ? "Resume sub-task" : "Pause sub-task"}
                                            aria-label={
                                              isPaused
                                                ? `Resume ${subtask.title}`
                                                : `Pause ${subtask.title}`
                                            }
                                          >
                                            {isPaused ? <Play size={13} /> : <PauseCircle size={13} />}
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActivityTask(task)}
                              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                              title="View activity"
                            >
                              <History size={16} />
                            </button>

                            {canManageProjects && (
                              <>
                                {task.status === "submitted" && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleApproveTask(task)}
                                      disabled={isBusy}
                                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                      <CheckCircle2 size={14} />
                                      {isBusy ? "..." : "Approve"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRejectTask(task)}
                                      disabled={isBusy}
                                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                                    >
                                      <XCircle size={14} />
                                      {isBusy ? "..." : "Reject"}
                                    </button>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openEditTaskModal(task)}
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                                  aria-label={`Edit ${task.title}`}
                                >
                                  <Edit2 size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task)}
                                  disabled={isBusy}
                                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600"
                                  aria-label={`Delete ${task.title}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  task.progress === 100 
                                    ? "bg-emerald-500" 
                                    : task.progress >= 70 
                                    ? "bg-blue-500" 
                                    : task.progress >= 30 
                                    ? "bg-amber-500" 
                                    : "bg-slate-400"
                                }`}
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 min-w-[36px] text-right">
                              {task.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="mx-auto w-full max-w-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">{monthLabel}</h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={goToPrevMonth}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Previous month"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextMonth}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Next month"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-1">
                  {WEEKDAYS.map((day) => (
                    <div
                      key={day}
                      className="py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      {day}
                    </div>
                  ))}

                  {calendarWeeks.flatMap((week, weekIndex) =>
                    week.map((dateKey, dayIndex) => {
                      if (!dateKey) {
                        return (
                          <div key={`${weekIndex}-${dayIndex}`} className="aspect-square" />
                        );
                      }

                      const dayTasks = tasksByDueDate.get(dateKey) ?? [];
                      const isToday = dateKey === todayKey;
                      const isSelected = dateKey === selectedDate;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() =>
                            setSelectedDate((prev) => (prev === dateKey ? null : dateKey))
                          }
                          className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-sm transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                              : isToday
                                ? "border-blue-200 bg-blue-50/50 text-slate-700"
                                : "border-slate-100 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={isToday ? "font-semibold" : undefined}>
                            {Number(dateKey.slice(-2))}
                          </span>
                          {dayTasks.length > 0 && (
                            <span className="rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                              {dayTasks.length}
                            </span>
                          )}
                        </button>
                      );
                    }),
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedDate ? `Tasks due ${selectedDate}` : "Select a date to view tasks"}
                </h3>

                {selectedDate && selectedDayTasks.length === 0 && (
                  <p className="mt-2 text-sm text-slate-400">No tasks due on this date.</p>
                )}

                {!selectedDate && (
                  <p className="mt-2 text-sm text-slate-400">
                    Click a date on the calendar to see tasks due that day.
                  </p>
                )}

                {selectedDayTasks.length > 0 && (
                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {selectedDayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-4 py-3 hover:border-blue-200 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {task.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {task.assignedTo?.name ?? "Unassigned"} ·{" "}
                            {taskPriorityLabels[task.priority]} priority
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${taskStatusStyles[task.status]}`}
                        >
                          {taskStatusLabels[task.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "analytics" && analyticsQuery.isLoading && (
            <div className="flex items-center justify-center py-12 text-sm text-slate-400">
              <Loader2 size={18} className="mr-2 animate-spin" />
              Loading analytics...
            </div>
          )}

          {activeTab === "analytics" && analyticsQuery.isError && (
            <p className="py-12 text-center text-sm text-red-500">
              Couldn't load analytics. Please try again.
            </p>
          )}

          {activeTab === "analytics" && analyticsQuery.data && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Task Status Breakdown</h2>
                <div className="mt-4 space-y-4">
                  {taskStatusBreakdown.map(({ status, count, percent }) => (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {taskStatusLabels[status]}
                        </span>
                        <span className="text-slate-500">
                          {count} · {percent}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${taskStatusBarColors[status]}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <h2 className="text-base font-semibold text-slate-900">Assignee Breakdown</h2>
                <p className="mt-0.5 text-xs text-slate-400">Share of total tasks per assignee</p>
                {assigneeChart.slices.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">No tasks assigned yet.</p>
                ) : (
                  <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
                    <div className="relative h-40 w-40 shrink-0">
                      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
                        <circle
                          cx="21"
                          cy="21"
                          r="15.9155"
                          fill="none"
                          stroke="#f1f5f9"
                          strokeWidth="7"
                        />
                        {(() => {
                          const gap = assigneeChart.slices.length > 1 ? 1.5 : 0;
                          let cumulative = 0;
                          return assigneeChart.slices.map((slice) => {
                            const percent = slice.percent;
                            const dash = Math.max(percent - gap, 0);
                            const offset = -(cumulative + gap / 2);
                            cumulative += percent;
                            return (
                              <circle
                                key={slice.id}
                                cx="21"
                                cy="21"
                                r="15.9155"
                                fill="none"
                                stroke={slice.color}
                                strokeWidth="7"
                                strokeLinecap="round"
                                strokeDasharray={`${dash} ${100 - dash}`}
                                strokeDashoffset={offset}
                              >
                                <title>
                                  {slice.name}: {slice.total} task{slice.total === 1 ? "" : "s"} (
                                  {Math.round(percent)}%)
                                </title>
                              </circle>
                            );
                          });
                        })()}
                      </svg>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-semibold text-slate-900">
                          {assigneeChart.totalAssigned}
                        </span>
                        <span className="text-[11px] text-slate-400">total tasks</span>
                      </div>
                    </div>

                    <div className="w-full min-w-0 space-y-3">
                      {assigneeChart.slices.map((slice) => (
                        <div key={slice.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: slice.color }}
                            />
                            <span className="truncate font-medium text-slate-700">
                              {slice.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-slate-500">
                            {slice.total} · {Math.round(slice.percent)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && canManageProjects && (
            <div className={`grid grid-cols-1 gap-8 ${isAdmin ? "lg:grid-cols-2" : ""}`}>
              <form className="space-y-4" onSubmit={handleSettingsSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={settingsForm.name}
                      onChange={(event) =>
                        setSettingsForm((prev) =>
                          prev ? { ...prev, name: event.target.value } : prev,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={settingsForm.client}
                      onChange={(event) =>
                        setSettingsForm((prev) =>
                          prev ? { ...prev, client: event.target.value } : prev,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={settingsForm.description}
                    onChange={(event) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, description: event.target.value } : prev,
                      )
                    }
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={settingsForm.startDate}
                      onChange={(event) =>
                        setSettingsForm((prev) =>
                          prev ? { ...prev, startDate: event.target.value } : prev,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={settingsForm.endDate}
                      min={settingsForm.startDate || undefined}
                      onChange={(event) =>
                        setSettingsForm((prev) =>
                          prev ? { ...prev, endDate: event.target.value } : prev,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Progress
                    </label>
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {project.progress}% · calculated automatically from task completion
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      value={settingsForm.status}
                      onChange={(event) =>
                        setSettingsForm((prev) =>
                          prev
                            ? { ...prev, status: event.target.value as ProjectStatus }
                            : prev,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Team
                  </label>
                  <select
                    value={settingsForm.teamId ?? ""}
                    onChange={(event) =>
                      setSettingsForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              teamId: event.target.value
                                ? Number(event.target.value)
                                : null,
                            }
                          : prev,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">No team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      GitHub Link
                    </label>
                    <input
                      type="url"
                      value={settingsForm.githubLink}
                      placeholder="https://github.com/org/repo"
                      onChange={(event) =>
                        setSettingsForm((prev) =>
                          prev ? { ...prev, githubLink: event.target.value } : prev,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Project PDF
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(event) =>
                        setSettingsForm((prev) =>
                          prev
                            ? { ...prev, pdfFile: event.target.files?.[0] ?? null }
                            : prev,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {project.pdf && !settingsForm.pdfFile && (
                      <a
                        href={project.pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                      >
                        View current PDF
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingSettings ? "Saving..." : "Save Changes"}
                  </button>
                  {settingsSaved && !savingSettings && (
                    <span className="text-sm text-emerald-600">Saved.</span>
                  )}
                </div>
              </form>

              {isAdmin && (
              <div className="border-t border-slate-100 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <h2 className="text-base font-semibold text-slate-900">Danger Zone</h2>
                <div className="mt-4 rounded-lg border border-red-100 bg-red-50/50 p-4">
                  <h3 className="text-sm font-semibold text-red-700">Delete this project</h3>
                  <p className="mt-1 text-sm text-red-600/80">
                    Deleting a project also removes it from the projects list. This cannot be
                    undone.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteProject}
                    disabled={deleting}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
                  >
                    <Trash2 size={16} />
                    {deleting ? "Deleting..." : "Delete Project"}
                  </button>
                </div>
              </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={editingTaskId ? "Edit Task" : "Add Task"}
      >
        <form className="space-y-4" onSubmit={handleTaskSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={taskForm.title}
              onChange={(event) =>
                setTaskForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="e.g. Implement login page"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              value={taskForm.description}
              onChange={(event) =>
                setTaskForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="What needs to be done?"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Assignee <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={taskForm.assignedTo || ""}
                onChange={(event) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    assignedTo: Number(event.target.value),
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select assignee</option>
                {(project?.members ?? []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                value={taskForm.priority}
                onChange={(event) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    priority: event.target.value as TaskPriority,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Due Date
            </label>
            <input
              type="date"
              value={taskForm.dueDate}
              onChange={(event) =>
                setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {editingTaskId && editableSubtasks.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Existing Sub-tasks
              </label>
              <p className="mb-2 text-xs text-slate-400">
                Rename a sub-task below — it'll be flagged "Edited" so the employee notices. Sub-tasks
                can't be deleted here; pause one from the task list instead.
              </p>

              <div className="space-y-1.5">
                {editableSubtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={subtask.title}
                      onChange={(event) =>
                        updateEditableSubtaskTitle(subtask.id, event.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    {subtask.status === "paused" && (
                      <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-500">
                        Paused
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {editingTaskId ? "Add New Sub-tasks" : "Sub-tasks (checklist)"}
            </label>

            {taskForm.subtasks.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {taskForm.subtasks.map((title, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                  >
                    <span className="truncate">{title}</span>
                    <button
                      type="button"
                      onClick={() => removeSubtaskDraft(index)}
                      className="shrink-0 text-slate-400 transition-colors hover:text-red-600"
                      aria-label="Remove sub-task"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={subtaskDraft}
                onChange={(event) => setSubtaskDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addSubtaskDraft();
                  }
                }}
                placeholder="e.g. Design the form"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={addSubtaskDraft}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {editingTaskId
                ? "New sub-tasks are flagged \"New\" so the employee can see what changed."
                : "The employee's progress moves from 10% to 70% as they check these off."}
            </p>
          </div>

          {taskError && <p className="text-sm text-red-600">{taskError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={savingTask}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {savingTask ? "Saving..." : editingTaskId ? "Save Changes" : "Add Task"}
            </button>
          </div>
        </form>
      </Modal>

      <TaskActivityModal
        open={activityTask != null}
        onClose={() => setActivityTask(null)}
        taskId={activityTask?.id ?? null}
        taskTitle={activityTask?.title}
      />
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  bg
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) => (
  <div className={`rounded-lg ${bg} p-3`}>
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-slate-500">{label}</span>
    </div>
    <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
  </div>
);

export default ProjectDetail;