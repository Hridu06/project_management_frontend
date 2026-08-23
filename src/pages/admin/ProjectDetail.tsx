import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Edit2,
  FolderKanban,
  ListChecks,
  Loader2,
  Plus,
  Search,
  Settings as SettingsIcon,
  Trash2,
  Users,
} from "lucide-react";
import Modal from "../../components/common/Modal";
import {
  deleteProject,
  getProjects,
  updateProject,
} from "../../services/projectService";
import { getEmployees } from "../../services/employeeService";
import { getTeamList } from "../../services/teamService";
import {
  createContribution,
  deleteContribution,
  getContributionsByProject,
  updateContribution,
  type ContributionInput,
} from "../../services/contributionService";
import type { Project, ProjectFormInput, ProjectStatus } from "../../types/project";
import type { Employee } from "../../types/employee";
import type { Team } from "../../types/team";
import type { UserRole } from "../../types/user";
import type {
  Contribution,
  ContributionPriority,
  ContributionStatus,
  ContributionType,
} from "../../types/attendance";

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

const contributionStatusStyles: Record<ContributionStatus, string> = {
  completed: "bg-emerald-50 text-emerald-600",
  "in-progress": "bg-amber-50 text-amber-600",
  pending: "bg-slate-100 text-slate-500",
};

const contributionStatusLabels: Record<ContributionStatus, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  pending: "Pending",
};

const contributionBarColors: Record<ContributionStatus, string> = {
  completed: "bg-emerald-500",
  "in-progress": "bg-amber-500",
  pending: "bg-slate-400",
};

const contributionTypeLabels: Record<ContributionType, string> = {
  task: "Task",
  bug: "Bug",
  feature: "Feature",
  improvement: "Improvement",
};

const contributionTypeStyles: Record<ContributionType, string> = {
  task: "bg-blue-50 text-blue-600",
  bug: "bg-red-50 text-red-600",
  feature: "bg-violet-50 text-violet-600",
  improvement: "bg-teal-50 text-teal-600",
};

const contributionPriorityLabels: Record<ContributionPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const contributionPriorityStyles: Record<ContributionPriority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-amber-50 text-amber-600",
  high: "bg-red-50 text-red-600",
};

const getTitle = (contribution: Contribution): string =>
  contribution.title?.trim() || contribution.task;

const getType = (contribution: Contribution): ContributionType =>
  contribution.type ?? "task";

const getPriority = (contribution: Contribution): ContributionPriority =>
  contribution.priority ?? "medium";

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyForm = (defaultEmployeeId: string): ContributionInput => ({
  employeeId: defaultEmployeeId,
  projectId: "",
  date: new Date().toISOString().slice(0, 10),
  startTime: "09:00",
  endTime: "17:00",
  title: "",
  task: "",
  type: "task",
  priority: "medium",
  status: "pending",
});

type TabId = "tasks" | "calendar" | "analytics" | "settings";

const TABS: { id: TabId; label: string; icon: typeof ListChecks }[] = [
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabId>("tasks");

  // Contribution modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ContributionInput>(emptyForm(""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");

  // Calendar tab state
  const today = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Settings tab state
  const [settingsForm, setSettingsForm] = useState<ProjectFormInput | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!projectId) return;

      const [projectList, employeeList, teamList, contributionList] =
        await Promise.all([
          getProjects(),
          getEmployees(),
          getTeamList(),
          getContributionsByProject(projectId),
        ]);

      const found =
        projectList.find((item) => String(item.id) === projectId) ?? null;
      setProject(found);
      setEmployees(employeeList);
      setTeams(teamList);
      setContributions(contributionList);
      setLoading(false);

      if (found) {
        setSettingsForm({
          name: found.name,
          client: found.client ?? "",
          description: found.description,
          status: found.status,
          startDate: found.startDate,
          endDate: found.endDate ?? "",
          progress: found.progress,
          teamId: found.teamId,
        });
      }
    };

    load();
  }, [projectId]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);

  // Project membership comes from the linked team's members (Users), which
  // are matched back to Employee records by email — the two tables aren't
  // directly linked on the frontend.
  const assignedEmployees = useMemo(() => {
    if (!project) return [];
    const memberEmails = new Set(project.members.map((member) => member.email));
    return employees.filter((employee) => memberEmails.has(employee.email));
  }, [project, employees]);

  // Statistics
  const stats = useMemo(() => {
    const totalContributions = contributions.length;
    const totalMinutes = contributions.reduce((total, c) => {
      const duration = toMinutes(c.endTime) - toMinutes(c.startTime);
      return total + Math.max(duration, 0);
    }, 0);

    const uniqueEmployees = new Set(contributions.map(c => c.employeeId));

    const completed = contributions.filter((c) => c.status === "completed").length;
    const inProgress = contributions.filter((c) => c.status === "in-progress").length;
    const pending = contributions.filter((c) => c.status === "pending").length;

    // Employee-wise summary
    const employeeSummary = new Map<string, { name: string; count: number; minutes: number }>();
    for (const c of contributions) {
      const emp = employeeMap.get(c.employeeId);
      if (!emp) continue;

      const existing = employeeSummary.get(c.employeeId);
      const duration = Math.max(toMinutes(c.endTime) - toMinutes(c.startTime), 0);

      if (existing) {
        existing.count++;
        existing.minutes += duration;
      } else {
        employeeSummary.set(c.employeeId, {
          name: emp.name,
          count: 1,
          minutes: duration,
        });
      }
    }

    return {
      totalContributions,
      totalHours: Math.round(totalMinutes / 60),
      totalMinutes,
      uniqueEmployees: uniqueEmployees.size,
      completed,
      inProgress,
      pending,
      employeeSummary: Array.from(employeeSummary.entries())
        .map(([id, data]) => ({
          id,
          ...data,
          hours: Math.round(data.minutes / 60),
        }))
        .sort((a, b) => b.minutes - a.minutes),
    };
  }, [contributions, employeeMap]);

  // Filtered contributions
  const filteredContributions = useMemo(() => {
    let filtered = [...contributions];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => {
        const emp = employeeMap.get(c.employeeId);
        return emp?.name.toLowerCase().includes(term) ||
               getTitle(c).toLowerCase().includes(term) ||
               c.task.toLowerCase().includes(term);
      });
    }

    if (filterEmployee !== "all") {
      filtered = filtered.filter(c => c.employeeId === filterEmployee);
    }

    if (filterDate) {
      filtered = filtered.filter(c => c.date === filterDate);
    }

    return filtered.sort((a, b) => a.date.localeCompare(b.date) ||
      toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [contributions, searchTerm, filterEmployee, filterDate, employeeMap]);

  // Calendar computations
  const contributionsByDate = useMemo(() => {
    const map = new Map<string, Contribution[]>();
    for (const c of contributions) {
      const list = map.get(c.date);
      if (list) list.push(c);
      else map.set(c.date, [c]);
    }
    return map;
  }, [contributions]);

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

  const selectedDayContributions = selectedDate
    ? (contributionsByDate.get(selectedDate) ?? []).sort(
        (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
      )
    : [];

  // Analytics computations
  const statusBreakdown = useMemo(() => {
    const total = contributions.length;
    return (["completed", "in-progress", "pending"] as ContributionStatus[]).map((status) => {
      const count = contributions.filter((c) => c.status === status).length;
      return {
        status,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });
  }, [contributions]);

  const maxEmployeeMinutes = useMemo(
    () => Math.max(1, ...stats.employeeSummary.map((s) => s.minutes)),
    [stats.employeeSummary],
  );

  const openAddModal = () => {
    setError("");
    setEditingId(null);
    setForm(emptyForm(assignedEmployees[0]?.id ?? ""));
    setModalOpen(true);
  };

  const openEditModal = (contribution: Contribution) => {
    setError("");
    setEditingId(contribution.id);
    setForm({
      employeeId: contribution.employeeId,
      projectId: contribution.projectId,
      date: contribution.date,
      startTime: contribution.startTime,
      endTime: contribution.endTime,
      title: getTitle(contribution),
      task: contribution.task,
      type: getType(contribution),
      priority: getPriority(contribution),
      status: contribution.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!projectId) return;

    setError("");
    setSaving(true);

    try {
      if (editingId) {
        const updated = await updateContribution(editingId, { ...form, projectId });
        setContributions((prev) =>
          prev.map((item) => (item.id === editingId ? updated : item))
        );
      } else {
        const created = await createContribution({ ...form, projectId });
        setContributions((prev) => [created, ...prev]);
      }

      setModalOpen(false);
    } catch (err) {
      setError("Failed to save contribution. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contribution: Contribution) => {
    const confirmed = window.confirm("Delete this contribution entry?");
    if (!confirmed) return;

    try {
      await deleteContribution(contribution.id);
      setContributions((prev) =>
        prev.filter((item) => item.id !== contribution.id),
      );
    } catch (err) {
      alert("Failed to delete contribution.");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Employee", "Title", "Type", "Priority", "Due Date", "Status", "Description"];
    const rows = contributions.map(c => {
      const emp = employeeMap.get(c.employeeId);
      return [
        emp?.name || "Unknown",
        getTitle(c),
        contributionTypeLabels[getType(c)],
        contributionPriorityLabels[getPriority(c)],
        c.date,
        contributionStatusLabels[c.status],
        c.task,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "project"}-contributions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSettingsSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!project || !settingsForm) return;

    setSavingSettings(true);
    setSettingsSaved(false);

    const updated = await updateProject(project.id, settingsForm);
    setProject(updated);
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
    await deleteProject(project.id);
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

      {/* Project Header */}
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

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon={<ListChecks size={18} className="text-blue-500" />}
            label="Total Tasks"
            value={String(stats.totalContributions)}
            bg="bg-blue-50"
          />
          <StatCard
            icon={<CheckCircle2 size={18} className="text-emerald-500" />}
            label="Completed"
            value={String(stats.completed)}
            bg="bg-emerald-50"
          />
          <StatCard
            icon={<Loader2 size={18} className="text-amber-500" />}
            label="In Progress"
            value={String(stats.inProgress)}
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

      {/* Tabs Card */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 px-2">
          {TABS.map((tab) => {
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
              {/* Assigned Employees */}
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
                      const summary = stats.employeeSummary.find(s => s.id === employee.id);
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
                              ({summary.hours}h)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Daily Contributions */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Daily Contributions
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {filteredContributions.length} entries found
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openAddModal}
                    disabled={assignedEmployees.length === 0}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Plus size={18} />
                    Add Tasks
                  </button>
                </div>

                {/* Filters */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[150px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee or task..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Employees</option>
                    {assignedEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />

                  {(searchTerm || filterEmployee !== "all" || filterDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterEmployee("all");
                        setFilterDate("");
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Task
                          </th>
                          <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Assignee
                          </th>
                          <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Type
                          </th>
                          <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Priority
                          </th>
                          <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Due Date
                          </th>
                          <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredContributions.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-14">
                              <div className="flex flex-col items-center gap-2 text-center">
                                <Clock3 size={22} className="text-slate-300" />
                                <p className="text-sm font-medium text-slate-500">
                                  No contributions logged yet
                                </p>
                                <p className="text-xs text-slate-400">
                                  {contributions.length > 0 ? "Try adjusting filters" : "Start by adding a contribution"}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}

                        {filteredContributions.map((contribution) => (
                          <tr
                            key={contribution.id}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="max-w-[240px] px-6 py-4">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {getTitle(contribution)}
                              </p>
                              {contribution.title && contribution.task && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                  {contribution.task}
                                </p>
                              )}
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600">
                              {employeeMap.get(contribution.employeeId)?.name ??
                                "Unknown"}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${contributionTypeStyles[getType(contribution)]}`}
                              >
                                {contributionTypeLabels[getType(contribution)]}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${contributionPriorityStyles[getPriority(contribution)]}`}
                              >
                                {contributionPriorityLabels[getPriority(contribution)]}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-sm text-slate-600">
                              {contribution.date}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${contributionStatusStyles[contribution.status]}`}
                              >
                                {contributionStatusLabels[contribution.status]}
                              </span>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(contribution)}
                                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                                  aria-label="Edit contribution"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(contribution)}
                                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                                  aria-label="Delete contribution"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

                      const dayContributions = contributionsByDate.get(dateKey) ?? [];
                      const isToday = dateKey === todayKey;
                      const isSelected = dateKey === selectedDate;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() =>
                            setSelectedDate((prev) => (prev === dateKey ? null : dateKey))
                          }
                          className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-sm transition-colors ${
                            isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : isToday
                                ? "border-blue-200 bg-blue-50/50 text-slate-700"
                                : "border-slate-100 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <span className={isToday ? "font-semibold" : undefined}>
                            {Number(dateKey.slice(-2))}
                          </span>
                          {dayContributions.length > 0 && (
                            <span className="rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                              {dayContributions.length}
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
                  {selectedDate ? `Tasks on ${selectedDate}` : "Select a date to view tasks"}
                </h3>

                {selectedDate && selectedDayContributions.length === 0 && (
                  <p className="mt-2 text-sm text-slate-400">No tasks logged on this date.</p>
                )}

                {!selectedDate && (
                  <p className="mt-2 text-sm text-slate-400">
                    Click a date on the calendar to see its tasks here.
                  </p>
                )}

                {selectedDayContributions.length > 0 && (
                  <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {selectedDayContributions.map((contribution) => (
                      <div
                        key={contribution.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {getTitle(contribution)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {employeeMap.get(contribution.employeeId)?.name ?? "Unknown"} ·{" "}
                            {contributionTypeLabels[getType(contribution)]} ·{" "}
                            {contributionPriorityLabels[getPriority(contribution)]} priority
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${contributionStatusStyles[contribution.status]}`}
                        >
                          {contributionStatusLabels[contribution.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Task Status Breakdown</h2>
                <div className="mt-4 space-y-4">
                  {statusBreakdown.map(({ status, count, percent }) => (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {contributionStatusLabels[status]}
                        </span>
                        <span className="text-slate-500">
                          {count} · {percent}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${contributionBarColors[status]}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <h2 className="text-base font-semibold text-slate-900">Contributor Breakdown</h2>
                {stats.employeeSummary.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">No contributions logged yet.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {stats.employeeSummary.map((summary) => (
                      <div key={summary.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{summary.name}</span>
                          <span className="text-slate-500">
                            {summary.count} entries · {summary.hours}h
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-violet-500"
                            style={{
                              width: `${Math.round((summary.minutes / maxEmployeeMinutes) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <form className="space-y-4" onSubmit={handleSettingsSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Project Name
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
                      Client
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
                      Start Date
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
                      Progress ({settingsForm.progress}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={settingsForm.progress}
                      onChange={(event) =>
                        setSettingsForm((prev) =>
                          prev ? { ...prev, progress: Number(event.target.value) } : prev,
                        )
                      }
                      className="w-full accent-blue-600"
                    />
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
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Task Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Task" : "Create New Task"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              required
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="e.g. UI / UX Design"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              required
              rows={3}
              value={form.task}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, task: event.target.value }))
              }
              placeholder="What needs to be done?"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Type
              </label>
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    type: event.target.value as ContributionType,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="improvement">Improvement</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: event.target.value as ContributionPriority,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Assignee
              </label>
              <select
                required
                value={form.employeeId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, employeeId: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {assignedEmployees.length === 0 && (
                  <option value="">Unassigned</option>
                )}
                {assignedEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as ContributionStatus,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="pending">{contributionStatusLabels.pending}</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Due Date
            </label>
            <div className="relative">
              <CalendarDays
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                required
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, date: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// Stat Card Component
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
