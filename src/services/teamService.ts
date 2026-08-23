import { apiRequest } from "./api";
import type {
  Team,
  TeamAssignableUser,
  TeamFormInput,
  TeamMember,
} from "../types/team";

interface ApiTeam {
  id: number;
  name: string;
  description: string | null;
  manager: { id: number; name: string } | null;
  member_count: number;
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

interface TeamListResponse {
  teams: ApiTeam[];
}

interface TeamResponse {
  message: string;
  team: ApiTeam;
}

const toTeam = (data: ApiTeam): Team => ({
  id: data.id,
  name: data.name,
  description: data.description,
  managerId: data.manager?.id ?? null,
  managerName: data.manager?.name ?? null,
  member_count: data.member_count,
  members: data.members,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

const toRequestBody = (input: TeamFormInput) => ({
  name: input.name,
  description: input.description || null,
  manager_id: input.managerId,
  members: input.members,
});

export const getTeamList = async (): Promise<Team[]> => {
  const data = await apiRequest<TeamListResponse>("/teams");
  return data.teams.map(toTeam);
};

export const getAssignableUsers = async (): Promise<TeamAssignableUser[]> => {
  const data = await apiRequest<{ users: TeamAssignableUser[] }>(
    "/teams/assignable-users",
  );
  return data.users;
};

export const createTeam = async (input: TeamFormInput): Promise<Team> => {
  const data = await apiRequest<TeamResponse>("/teams", {
    method: "POST",
    body: toRequestBody(input),
  });

  return toTeam(data.team);
};

export const updateTeam = async (
  id: number,
  input: TeamFormInput,
): Promise<Team> => {
  const data = await apiRequest<TeamResponse>(`/teams/${id}`, {
    method: "PUT",
    body: toRequestBody(input),
  });

  return toTeam(data.team);
};

export const deleteTeam = (id: number): Promise<void> =>
  apiRequest(`/teams/${id}`, { method: "DELETE" });
