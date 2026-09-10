import { apiRequest } from "./api";
import type {
  LeaveBalance,
  LeavePersonRef,
  LeaveQuotas,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  ManagerAction,
} from "../types/leave";

interface ApiLeaveRequest {
  id: number;
  user: LeavePersonRef | null;
  type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  is_half_day: boolean;
  reason: string;
  status: LeaveStatus;
  manager: LeavePersonRef | null;
  manager_action: ManagerAction;
  manager_decided_at: string | null;
  manager_note: string | null;
  decider: LeavePersonRef | null;
  decided_at: string | null;
  decision_note: string | null;
  applied_at: string;
}

interface LeaveListResponse {
  leave_requests: ApiLeaveRequest[];
}

interface LeaveResponse {
  message: string;
  leave_request: ApiLeaveRequest;
}

interface ApiLeaveBalance {
  type: LeaveType;
  quota: number | null;
  used: number;
  remaining: number | null;
}

interface LeaveBalancesResponse {
  balances: ApiLeaveBalance[];
}

interface LeaveQuotasResponse {
  quotas: LeaveQuotas;
}

const toLeaveRequest = (data: ApiLeaveRequest): LeaveRequest => ({
  id: data.id,
  user: data.user,
  type: data.type,
  startDate: data.start_date,
  endDate: data.end_date,
  days: data.days,
  isHalfDay: data.is_half_day,
  reason: data.reason,
  status: data.status,
  manager: data.manager,
  managerAction: data.manager_action,
  managerDecidedAt: data.manager_decided_at,
  managerNote: data.manager_note,
  decider: data.decider,
  decidedAt: data.decided_at,
  decisionNote: data.decision_note,
  appliedAt: data.applied_at,
});

export interface LeaveFilters {
  status?: LeaveStatus;
  type?: LeaveType;
  userId?: number;
}

export const getLeaveRequests = async (filters?: LeaveFilters): Promise<LeaveRequest[]> => {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.userId) params.set("user_id", String(filters.userId));

  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await apiRequest<LeaveListResponse>(`/leave${query}`);
  return data.leave_requests.map(toLeaveRequest);
};

export interface ApplyLeaveInput {
  type: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  reason: string;
}

export const applyLeave = async (input: ApplyLeaveInput): Promise<LeaveRequest> => {
  const data = await apiRequest<LeaveResponse>("/leave", {
    method: "POST",
    body: {
      type: input.type,
      start_date: input.startDate,
      end_date: input.endDate,
      is_half_day: input.isHalfDay,
      reason: input.reason,
    },
  });

  return toLeaveRequest(data.leave_request);
};

export const cancelLeave = async (id: number): Promise<LeaveRequest> => {
  const data = await apiRequest<LeaveResponse>(`/leave/${id}/cancel`, { method: "POST" });
  return toLeaveRequest(data.leave_request);
};

export const managerApproveLeave = async (id: number, note?: string): Promise<LeaveRequest> => {
  const data = await apiRequest<LeaveResponse>(`/leave/${id}/manager-approve`, {
    method: "POST",
    body: note ? { note } : undefined,
  });
  return toLeaveRequest(data.leave_request);
};

export const managerRejectLeave = async (id: number, note: string): Promise<LeaveRequest> => {
  const data = await apiRequest<LeaveResponse>(`/leave/${id}/manager-reject`, {
    method: "POST",
    body: { note },
  });
  return toLeaveRequest(data.leave_request);
};

export const approveLeave = async (id: number, note?: string): Promise<LeaveRequest> => {
  const data = await apiRequest<LeaveResponse>(`/leave/${id}/approve`, {
    method: "POST",
    body: note ? { note } : undefined,
  });
  return toLeaveRequest(data.leave_request);
};

export const rejectLeave = async (id: number, note: string): Promise<LeaveRequest> => {
  const data = await apiRequest<LeaveResponse>(`/leave/${id}/reject`, {
    method: "POST",
    body: { note },
  });
  return toLeaveRequest(data.leave_request);
};

export const getLeaveBalances = async (userId?: number): Promise<LeaveBalance[]> => {
  const query = userId ? `?user_id=${userId}` : "";
  const data = await apiRequest<LeaveBalancesResponse>(`/leave-balances${query}`);
  return data.balances;
};

export const getLeaveQuotas = async (): Promise<LeaveQuotas> => {
  const data = await apiRequest<LeaveQuotasResponse>("/leave-quotas");
  return data.quotas;
};

export const updateLeaveQuotas = async (quotas: LeaveQuotas): Promise<LeaveQuotas> => {
  const data = await apiRequest<LeaveQuotasResponse>("/leave-quotas", {
    method: "PUT",
    body: quotas,
  });
  return data.quotas;
};

export const countLeaveDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

// Every "YYYY-MM-DD" date from startDate to endDate inclusive — used to
// overlay approved leave onto the day-by-day Attendance views.
export const expandDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const pad = (value: number) => String(value).padStart(2, "0");

  while (cursor <= end) {
    dates.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};
