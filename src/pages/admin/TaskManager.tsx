import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks } from "lucide-react";
import { getProjects } from "../../services/projectService";
import type { Project } from "../../types/project";

const TaskManager = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    const load = async () => {
      const list = await getProjects();
      setProjects(list);
      setLoading(false);
    };

    load();
  }, []);

  const goToProjectTasks = () => {
    if (!selectedProjectId) return;
    navigate(`/app/projects/${selectedProjectId}?tab=tasks`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a project to view and add tasks for it.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Select Project <span className="text-red-500">*</span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            disabled={loading}
            className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
          >
            <option value="">
              {loading ? "Loading projects..." : "Choose a project..."}
            </option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
                {project.client ? ` — ${project.client}` : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={goToProjectTasks}
            disabled={!selectedProjectId}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <ListChecks size={18} />
            View Tasks
          </button>
        </div>

        {!loading && projects.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">
            No projects yet. Create a project first from the Projects page.
          </p>
        )}
      </div>
    </div>
  );
};

export default TaskManager;
