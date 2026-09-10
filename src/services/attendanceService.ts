import { apiRequest } from "./api";
import type { AttendanceRecord, AttendanceStatus, AttendanceUserRef } from "../types/attendance";

interface ApiAttendanceUser {
  id: number;
  name: string;
  department: string | null;
  teams: string[];
}

interface ApiAttendance {
  id: number;
  user: ApiAttendanceUser | null;
  date: string;
  check_in_at: string;
  check_out_at: string | null;
  total_minutes: number | null;
  status: AttendanceStatus | null;
}

interface AttendanceListResponse {
  attendances: ApiAttendance[];
}

interface AttendanceResponse {
  message: string;
  attendance: ApiAttendance;
}

interface AttendanceTodayResponse {
  attendance: ApiAttendance | null;
}

const toUser = (data: ApiAttendanceUser | null): AttendanceUserRef | null =>
  data && { id: data.id, name: data.name, department: data.department, teams: data.teams };

const toRecord = (data: ApiAttendance): AttendanceRecord => ({
  id: data.id,
  user: toUser(data.user),
  date: data.date,
  checkInAt: data.check_in_at,
  checkOutAt: data.check_out_at,
  totalMinutes: data.total_minutes,
  status: data.status,
});

export interface AttendanceFilters {
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const getAttendanceRecords = async (
  filters?: AttendanceFilters,
): Promise<AttendanceRecord[]> => {
  const params = new URLSearchParams();
  if (filters?.userId) params.set("user_id", String(filters.userId));
  if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
  if (filters?.dateTo) params.set("date_to", filters.dateTo);

  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await apiRequest<AttendanceListResponse>(`/attendance${query}`);
  return data.attendances.map(toRecord);
};

export const getTodayAttendance = async (): Promise<AttendanceRecord | null> => {
  const data = await apiRequest<AttendanceTodayResponse>("/attendance/today");
  return data.attendance ? toRecord(data.attendance) : null;
};

export const checkIn = async (): Promise<AttendanceRecord> => {
  const data = await apiRequest<AttendanceResponse>("/attendance/check-in", {
    method: "POST",
  });
  return toRecord(data.attendance);
};

export const checkOut = async (): Promise<AttendanceRecord> => {
  const data = await apiRequest<AttendanceResponse>("/attendance/check-out", {
    method: "POST",
  });
  return toRecord(data.attendance);
};

export const formatDuration = (totalMinutes: number | null): string => {
  if (totalMinutes == null) return "-";

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};
