import { apiRequest } from "./api";
import type { Project, ProjectFormInput, ProjectMember } from "../types/project";

interface ApiProject {
  id: number;
  name: string;
  description: string;
  status: Project["status"];
  client: string | null;
  progress: number;
  start_date: string;
  end_date: string | null;
  team: { id: number; name: string; members: ProjectMember[] } | null;
  owner: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

interface ProjectListResponse {
  projects: ApiProject[];
}

interface ProjectResponse {
  message: string;
  project: ApiProject;
}

const toProject = (data: ApiProject): Project => ({
  id: data.id,
  name: data.name,
  description: data.description,
  status: data.status,
  client: data.client,
  progress: data.progress,
  startDate: data.start_date,
  endDate: data.end_date,
  teamId: data.team?.id ?? null,
  teamName: data.team?.name ?? null,
  members: data.team?.members ?? [],
  ownerId: data.owner?.id ?? 0,
  ownerName: data.owner?.name ?? null,
});

const toRequestBody = (input: ProjectFormInput) => ({
  name: input.name,
  description: input.description,
  status: input.status,
  client: input.client || null,
  progress: input.progress,
  start_date: input.startDate,
  end_date: input.endDate || null,
  team_id: input.teamId,
});

export const getProjects = async (): Promise<Project[]> => {
  const data = await apiRequest<ProjectListResponse>("/projects");
  return data.projects.map(toProject);
};

export const createProject = async (
  input: ProjectFormInput,
): Promise<Project> => {
  const data = await apiRequest<ProjectResponse>("/projects", {
    method: "POST",
    body: toRequestBody(input),
  });

  return toProject(data.project);
};

export const updateProject = async (
  id: number,
  input: ProjectFormInput,
): Promise<Project> => {
  const data = await apiRequest<ProjectResponse>(`/projects/${id}`, {
    method: "PUT",
    body: toRequestBody(input),
  });

  return toProject(data.project);
};

export const deleteProject = (id: number): Promise<void> =>
  apiRequest(`/projects/${id}`, { method: "DELETE" });
