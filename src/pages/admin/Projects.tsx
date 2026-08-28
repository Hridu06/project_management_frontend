import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  FolderKanban,
  Plus,
  Search,
} from "lucide-react";
import Modal from "../../components/common/Modal";
import {
  useCreateProjectMutation,
  useProjectsQuery,
  useUpdateProjectMutation,
} from "../../hooks/useProjectQueries";
import { useTeamsQuery } from "../../hooks/useTeamQueries";
import { useAuth } from "../../context/AuthContext";
import type { ProjectFormInput, ProjectStatus } from "../../types/project";

const emptyForm: ProjectFormInput = {
  name: "",
  client: "",
  description: "",
  status: "active",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  progress: 0,
  pdfFile: null,
  githubLink: "",
  teamId: null,
};

const statusStyles: Record<ProjectStatus, string> = {
  active: "bg-emerald-50 text-emerald-600",
  on_hold: "bg-amber-50 text-amber-600",
  completed: "bg-slate-100 text-slate-500",
  archived: "bg-slate-100 text-slate-400",
};

const statusLabels: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

const Projects = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  // Managers can create and edit projects alongside admins; deleting stays
  // admin-only. Employees get a read-only view.
  const canManageProjects = isAdmin || isManager;

  const projectsQuery = useProjectsQuery();
  const teamsQuery = useTeamsQuery();
  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();

  const projects = projectsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const loading = projectsQuery.isLoading || teamsQuery.isLoading;
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProjectFormInput>(emptyForm);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return projects;

    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term) ||
        (project.client ?? "").toLowerCase().includes(term),
    );
  }, [projects, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCurrentPdfUrl(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);

    if (editingId) {
      await updateProjectMutation.mutateAsync({ id: editingId, input: form });
    } else {
      await createProjectMutation.mutateAsync(form);
    }

    setSaving(false);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            {canManageProjects
              ? "Create projects and assign employees to them."
              : "Projects you're assigned to and their progress."}
          </p>
        </div>

        {canManageProjects && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Project
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by project or client"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Project Cards */}
      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400">
          Loading projects...
        </div>
      )}

      {!loading && filteredProjects.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14">
          <div className="flex flex-col items-center gap-2 text-center">
            <FolderKanban size={22} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              No projects found
            </p>
          </div>
        </div>
      )}

      {!loading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                    <FolderKanban size={18} />
                  </div>

                  <div>
                    <Link
                      to={`/app/projects/${project.id}`}
                      className="text-sm font-semibold text-slate-800 hover:text-blue-600 hover:underline"
                    >
                      {project.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {project.client || "No client"}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[project.status]}`}
                >
                  {statusLabels[project.status]}
                </span>
              </div>

              <p className="line-clamp-2 text-xs text-slate-500">
                {project.description}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Start Date</p>
                  <p className="mt-0.5 font-medium text-slate-700">
                    {project.startDate}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-400">Assigned</p>
                  <p className="mt-0.5 font-medium text-slate-700">
                    {project.teamName ?? "Unassigned"}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Progress</span>
                  <span className="font-semibold text-slate-700">
                    {project.progress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                <Link
                  to={`/app/projects/${project.id}`}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                  aria-label={`View ${project.name}`}
                >
                  <Eye size={16} />
                </Link>

                {/* {canManageProjects && (
                  <button
                    type="button"
                    onClick={() => openEditModal(project)}
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                    aria-label={`Edit ${project.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                )} */}

                {/* {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(project)}
                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )} */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Project" : "Add Project"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
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
                value={form.client}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, client: event.target.value }))
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
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
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
                value={form.startDate}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
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
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
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
                  status: event.target.value as ProjectStatus,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Team
            </label>
            <select
              value={form.teamId ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  teamId: event.target.value ? Number(event.target.value) : null,
                }))
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
                value={form.githubLink}
                placeholder="https://github.com/org/repo"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    githubLink: event.target.value,
                  }))
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
                  setForm((prev) => ({
                    ...prev,
                    pdfFile: event.target.files?.[0] ?? null,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              {currentPdfUrl && !form.pdfFile && (
                <a
                  href={currentPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                >
                  View current PDF
                </a>
              )}
            </div>
          </div>

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
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Projects;
