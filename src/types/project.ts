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

export interface MyTaskBreakdown {
  total: number;
  notStarted: number;
  inProgress: number;
  submitted: number;
  completed: number;
}

// Per-project summary of "my" work — what an employee sees on the
// Projects menu instead of the full projects list.
export interface MyProjectSummary {
  project: Project;
  myTasks: MyTaskBreakdown;
  myProgress: number;
  contributionPercent: number;
  lastActivityAt: string | null;
}
