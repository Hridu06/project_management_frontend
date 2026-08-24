import { apiRequest } from "./api";
import type { Task, TaskFormInput, TaskPersonRef, TaskUpdateInput } from "../types/task";

interface ApiTask {
  id: number;
  project: { id: number; name: string } | null;
  parent_id: number | null;
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  progress: number;
  due_date: string | null;
  assigned_to: TaskPersonRef | null;
  created_by: TaskPersonRef | null;
  approved_by: TaskPersonRef | null;
  submitted_at: string | null;
  approved_at: string | null;
  subtasks: ApiTask[];
  created_at: string;
  updated_at: string;
}

interface TaskListResponse {
  tasks: ApiTask[];
}

interface TaskResponse {
  message: string;
  task: ApiTask;
}

const toTask = (data: ApiTask): Task => ({
  id: data.id,
  projectId: data.project?.id ?? null,
  projectName: data.project?.name ?? null,
  parentId: data.parent_id,
  title: data.title,
  description: data.description,
  status: data.status,
  priority: data.priority,
  progress: data.progress,
  dueDate: data.due_date,
  assignedTo: data.assigned_to,
  createdBy: data.created_by,
  approvedBy: data.approved_by,
  submittedAt: data.submitted_at,
  approvedAt: data.approved_at,
  subtasks: (data.subtasks ?? []).map(toTask),
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

export interface TaskFilters {
  projectId?: number;
  assignedTo?: number;
  status?: Task["status"];
  dateFrom?: string;
  dateTo?: string;
}

export const getTasks = async (filters?: TaskFilters): Promise<Task[]> => {
  const params = new URLSearchParams();
  if (filters?.projectId) params.set("project_id", String(filters.projectId));
  if (filters?.assignedTo) params.set("assigned_to", String(filters.assignedTo));
  if (filters?.status) params.set("status", filters.status);
  if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters?.dateTo) params.set("date_to", filters.dateTo);

  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await apiRequest<TaskListResponse>(`/tasks${query}`);
  return data.tasks.map(toTask);
};

export const createTask = async (input: TaskFormInput): Promise<Task> => {
  const data = await apiRequest<TaskResponse>("/tasks", {
    method: "POST",
    body: {
      project_id: input.projectId,
      assigned_to: input.assignedTo,
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      due_date: input.dueDate || null,
      subtasks: input.subtasks.map((title) => title.trim()).filter(Boolean),
    },
  });

  return toTask(data.task);
};

export const updateTask = async (id: number, input: TaskUpdateInput): Promise<Task> => {
  const data = await apiRequest<TaskResponse>(`/tasks/${id}`, {
    method: "PUT",
    body: {
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      assigned_to: input.assignedTo,
      due_date: input.dueDate || null,
    },
  });

  return toTask(data.task);
};

export const deleteTask = (id: number): Promise<void> =>
  apiRequest(`/tasks/${id}`, { method: "DELETE" });

export const startTask = async (id: number): Promise<Task> => {
  const data = await apiRequest<TaskResponse>(`/tasks/${id}/start`, {
    method: "POST",
  });

  return toTask(data.task);
};

export const submitTask = async (id: number): Promise<Task> => {
  const data = await apiRequest<TaskResponse>(`/tasks/${id}/submit`, {
    method: "POST",
  });

  return toTask(data.task);
};

export const approveTask = async (id: number): Promise<Task> => {
  const data = await apiRequest<TaskResponse>(`/tasks/${id}/approve`, {
    method: "POST",
  });

  return toTask(data.task);
};

export const toggleSubtask = async (taskId: number, subtaskId: number): Promise<Task> => {
  const data = await apiRequest<TaskResponse>(
    `/tasks/${taskId}/subtasks/${subtaskId}/toggle`,
    { method: "POST" },
  );

  return toTask(data.task);
};
