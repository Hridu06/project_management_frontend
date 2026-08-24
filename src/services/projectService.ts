import { apiRequest } from "./api";
import type {
  MyProjectSummary,
  Project,
  ProjectFormInput,
  ProjectMember,
} from "../types/project";

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

interface ApiMyProjectSummary {
  project: ApiProject;
  my_tasks: {
    total: number;
    not_started: number;
    in_progress: number;
    submitted: number;
    completed: number;
  };
  my_progress: number;
  contribution_percent: number;
  last_activity_at: string | null;
}

interface MyProjectsSummaryResponse {
  projects: ApiMyProjectSummary[];
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

const toMyProjectSummary = (data: ApiMyProjectSummary): MyProjectSummary => ({
  project: toProject(data.project),
  myTasks: {
    total: data.my_tasks.total,
    notStarted: data.my_tasks.not_started,
    inProgress: data.my_tasks.in_progress,
    submitted: data.my_tasks.submitted,
    completed: data.my_tasks.completed,
  },
  myProgress: data.my_progress,
  contributionPercent: data.contribution_percent,
  lastActivityAt: data.last_activity_at,
});

export const getMyProjectsSummary = async (): Promise<MyProjectSummary[]> => {
  const data = await apiRequest<MyProjectsSummaryResponse>("/projects/my-summary");
  return data.projects.map(toMyProjectSummary);
};
