export type TaskStatus = "not_started" | "in_progress" | "submitted" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskPersonRef {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  projectId: number | null;
  projectName: string | null;
  parentId: number | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  dueDate: string | null;
  assignedTo: TaskPersonRef | null;
  createdBy: TaskPersonRef | null;
  approvedBy: TaskPersonRef | null;
  submittedAt: string | null;
  approvedAt: string | null;
  subtasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormInput {
  projectId: number;
  assignedTo: number;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  subtasks: string[];
}

export interface TaskUpdateInput {
  title: string;
  description: string;
  priority: TaskPriority;
  assignedTo: number;
  dueDate: string;
}
