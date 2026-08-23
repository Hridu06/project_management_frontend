export type ProjectStatus = "active" | "completed" | "on_hold" | "archived";

export interface ProjectMember {
  id: number;
  name: string;
  email: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  client: string | null;
  progress: number;
  startDate: string;
  endDate: string | null;
  teamId: number | null;
  teamName: string | null;
  members: ProjectMember[];
  ownerId: number;
  ownerName: string | null;
}

export interface ProjectFormInput {
  name: string;
  description: string;
  status: ProjectStatus;
  client: string;
  progress: number;
  startDate: string;
  endDate: string;
  teamId: number | null;
}
