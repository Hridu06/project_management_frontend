export type AttendanceStatus = "present" | "late" | "half-day" | "absent";

export type ContributionStatus = "pending" | "in-progress" | "completed";

export type ContributionType = "task" | "bug" | "feature" | "improvement";

export type ContributionPriority = "low" | "medium" | "high";

export interface Contribution {
  id: string;
  employeeId: string;
  projectId: string;
  date: string;
  startTime: string;
  endTime: string;
  task: string;
  status: ContributionStatus;
  title?: string;
  type?: ContributionType;
  priority?: ContributionPriority;
}

export interface AttendanceUserRef {
  id: number;
  name: string;
  department: string | null;
  teams: string[];
}

export interface AttendanceRecord {
  id: number;
  user: AttendanceUserRef | null;
  date: string;
  checkInAt: string;
  checkOutAt: string | null;
  totalMinutes: number | null;
  status: AttendanceStatus | null;
}
