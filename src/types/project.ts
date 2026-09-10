import type { TaskStatus } from "./task";

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
  pdf: string | null;
  githubLink: string | null;
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
  pdfFile: File | null;
  githubLink: string;
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

export interface TaskStatusBreakdownItem {
  status: TaskStatus;
  count: number;
  percent: number;
}

// A single assignee's share of the project's assigned tasks (e.g. "User A
// did 10 of 15 (67%)"), computed server-side so the frontend just renders it.
export interface AssigneeBreakdownItem {
  id: number;
  name: string;
  total: number;
  completed: number;
  percent: number;
}

export interface ProjectAnalytics {
  total: number;
  totalAssigned: number;
  taskStatusBreakdown: TaskStatusBreakdownItem[];
  assigneeBreakdown: AssigneeBreakdownItem[];
}
