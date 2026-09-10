import { apiRequest } from "./api";

export interface AttendanceThresholds {
  presentHours: number;
  halfDayHours: number;
  officeStartTime: string;
}

interface ApiAttendanceThresholds {
  present_hours: number;
  half_day_hours: number;
  office_start_time: string;
}

interface AttendanceSettingsResponse {
  settings: ApiAttendanceThresholds;
}

const toThresholds = (data: ApiAttendanceThresholds): AttendanceThresholds => ({
  presentHours: data.present_hours,
  halfDayHours: data.half_day_hours,
  officeStartTime: data.office_start_time,
});

export const getAttendanceThresholds = async (): Promise<AttendanceThresholds> => {
  const data = await apiRequest<AttendanceSettingsResponse>("/attendance-settings");
  return toThresholds(data.settings);
};

export const updateAttendanceThresholds = async (
  input: AttendanceThresholds,
): Promise<AttendanceThresholds> => {
  const data = await apiRequest<AttendanceSettingsResponse>("/attendance-settings", {
    method: "PUT",
    body: {
      present_hours: input.presentHours,
      half_day_hours: input.halfDayHours,
      office_start_time: input.officeStartTime,
    },
  });

  return toThresholds(data.settings);
};
