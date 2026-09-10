export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveType = "sick" | "casual" | "annual" | "unpaid";
export type ManagerAction = "approved" | "rejected" | null;

export interface LeavePersonRef {
  id: number;
  name: string;
}

export interface LeaveRequest {
  id: number;
  user: LeavePersonRef | null;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  isHalfDay: boolean;
  reason: string;
  status: LeaveStatus;
  manager: LeavePersonRef | null;
  managerAction: ManagerAction;
  managerDecidedAt: string | null;
  managerNote: string | null;
  decider: LeavePersonRef | null;
  decidedAt: string | null;
  decisionNote: string | null;
  appliedAt: string;
}

export interface LeaveBalance {
  type: LeaveType;
  quota: number | null;
  used: number;
  remaining: number | null;
}

export interface LeaveQuotas {
  sick: number;
  casual: number;
  annual: number;
}
