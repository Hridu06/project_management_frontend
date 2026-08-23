import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Clock3, Plus, Search, Trash2 } from "lucide-react";
import Modal from "../../components/common/Modal";
import {
  createContribution,
  deleteContribution,
  getContributions,
  type ContributionInput,
} from "../../services/contributionService";
import { getEmployees } from "../../services/employeeService";
import { getProjects } from "../../services/projectService";
import type { Contribution, ContributionStatus } from "../../types/attendance";
import type { Employee } from "../../types/employee";
import type { Project } from "../../types/project";

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatDuration = (startTime: string, endTime: string): string => {
  const totalMinutes = toMinutes(endTime) - toMinutes(startTime);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (totalMinutes <= 0) return "0m";
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
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

const emptyForm: ContributionInput = {
  employeeId: "",
  projectId: "",
  date: new Date().toISOString().slice(0, 10),
  startTime: "09:00",
  endTime: "17:00",
  task: "",
  status: "pending",
};

const Contributions = () => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ContributionInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const [contributionList, employeeList, projectList] = await Promise.all([
        getContributions(),
        getEmployees(),
        getProjects(),
      ]);

      setContributions(contributionList);
      setEmployees(employeeList);
      setProjects(projectList);
      setLoading(false);
    };

    load();
  }, []);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const project of projects) map.set(String(project.id), project);
    return map;
  }, [projects]);

  // Project membership comes from the linked team's members (Users), which
  // are matched back to Employee records by email — the two tables aren't
  // directly linked on the frontend.
  const assignableEmployees = useMemo(() => {
    const project = projectMap.get(form.projectId);
    if (!project) return [];
    const memberEmails = new Set(project.members.map((member) => member.email));
    return employees.filter((employee) => memberEmails.has(employee.email));
  }, [form.projectId, projectMap, employees]);

  const filteredContributions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return contributions
      .filter((item) => {
        const matchesProject =
          projectFilter === "all" || item.projectId === projectFilter;

        const employeeName = employeeMap.get(item.employeeId)?.name ?? "";
        const matchesSearch =
          !term ||
          employeeName.toLowerCase().includes(term) ||
          item.task.toLowerCase().includes(term);

        return matchesProject && matchesSearch;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [contributions, search, projectFilter, employeeMap]);

  const openAddModal = () => {
    setError("");
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleProjectChange = (projectId: string) => {
    const project = projectMap.get(projectId);
    const memberEmails = new Set(project?.members.map((member) => member.email));
    const firstEmployeeId =
      employees.find((employee) => memberEmails.has(employee.email))?.id ?? "";

    setForm((prev) => ({
      ...prev,
      projectId,
      employeeId: firstEmployeeId,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.projectId || !form.employeeId) {
      setError("Please select a project and an employee.");
      return;
    }

    if (toMinutes(form.endTime) <= toMinutes(form.startTime)) {
      setError("End time must be after start time.");
      return;
    }

    setError("");
    setSaving(true);

    const created = await createContribution(form);
    setContributions((prev) => [created, ...prev]);

    setSaving(false);
    setModalOpen(false);
  };

  const handleDelete = async (contribution: Contribution) => {
    const confirmed = window.confirm("Delete this contribution entry?");
    if (!confirmed) return;

    await deleteContribution(contribution.id);
    setContributions((prev) =>
      prev.filter((item) => item.id !== contribution.id),
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contributions</h1>
          <p className="mt-1 text-sm text-slate-500">
            Daily project contributions logged by employees — attendance is
            calculated from this data.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          disabled={projects.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={18} />
          Add Contribution
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by employee or task"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <select
          value={projectFilter}
          onChange={(event) => setProjectFilter(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All Projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employee
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Project
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Time
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Task
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
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading contributions...
                  </td>
                </tr>
              )}

              {!loading && filteredContributions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Clock3 size={22} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No contributions found
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredContributions.map((contribution) => (
                  <tr
                    key={contribution.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                          {(employeeMap.get(contribution.employeeId)?.name ?? "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <span className="text-sm font-medium text-slate-800">
                          {employeeMap.get(contribution.employeeId)?.name ??
                            "Unknown"}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {projectMap.get(contribution.projectId)?.name ??
                        "Unknown"}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {contribution.date}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {contribution.startTime} - {contribution.endTime}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatDuration(contribution.startTime, contribution.endTime)}
                    </td>

                    <td className="max-w-[200px] px-6 py-4 text-sm text-slate-600">
                      <p className="line-clamp-1">{contribution.task}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${contributionStatusStyles[contribution.status]}`}
                      >
                        {contributionStatusLabels[contribution.status]}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(contribution)}
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                        aria-label="Delete contribution"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contribution Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Contribution"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Project
            </label>
            <select
              required
              value={form.projectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>
                Select a project
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Employee
            </label>
            <select
              required
              value={form.employeeId}
              disabled={!form.projectId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, employeeId: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            >
              <option value="" disabled>
                {form.projectId
                  ? "Select an employee"
                  : "Select a project first"}
              </option>
              {assignableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            {form.projectId && assignableEmployees.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                No employees are assigned to this project yet.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Date
            </label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, date: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Start Time
              </label>
              <input
                required
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startTime: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                End Time
              </label>
              <input
                required
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, endTime: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Task Details
            </label>
            <textarea
              required
              rows={3}
              value={form.task}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, task: event.target.value }))
              }
              placeholder="What was worked on?"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
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
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Contribution"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Contributions;
