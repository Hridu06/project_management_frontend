import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, PlaneTakeoff } from "lucide-react";
import { getAttendanceRecords } from "../../services/attendanceService";
import { expandDateRange, getLeaveRequests } from "../../services/leaveService";
import type { AttendanceRecord, AttendanceStatus } from "../../types/attendance";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type CellState = AttendanceStatus | "checked-in" | "on-leave" | "none";

const cellStyles: Record<CellState, { cell: string; day: string; badge: string; dot: string }> = {
  present: {
    cell: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100",
    day: "text-emerald-800",
    badge: "bg-emerald-600 text-white",
    dot: "bg-emerald-500",
  },
  late: {
    cell: "border-orange-200 bg-orange-50 hover:bg-orange-100",
    day: "text-orange-800",
    badge: "bg-orange-500 text-white",
    dot: "bg-orange-500",
  },
  "half-day": {
    cell: "border-amber-200 bg-amber-50 hover:bg-amber-100",
    day: "text-amber-800",
    badge: "bg-amber-500 text-white",
    dot: "bg-amber-500",
  },
  absent: {
    cell: "border-red-200 bg-red-50 hover:bg-red-100",
    day: "text-red-800",
    badge: "bg-red-600 text-white",
    dot: "bg-red-500",
  },
  "checked-in": {
    cell: "border-blue-200 bg-blue-50 hover:bg-blue-100",
    day: "text-blue-800",
    badge: "bg-blue-600 text-white",
    dot: "bg-blue-500",
  },
  "on-leave": {
    cell: "border-violet-200 bg-violet-50 hover:bg-violet-100",
    day: "text-violet-800",
    badge: "bg-violet-600 text-white",
    dot: "bg-violet-500",
  },
  none: {
    cell: "border-slate-100 bg-white hover:bg-slate-50",
    day: "text-slate-700",
    badge: "",
    dot: "bg-slate-300",
  },
};

const statusLabels: Record<CellState, string> = {
  present: "Present",
  late: "Late",
  "half-day": "Half Day",
  absent: "Absent",
  "checked-in": "Checked In",
  "on-leave": "On Leave",
  none: "No Record",
};

const legendItems: Exclude<CellState, "none">[] = [
  "present",
  "late",
  "half-day",
  "absent",
  "checked-in",
  "on-leave",
];

const formatTime12 = (iso: string): string => {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatHours = (totalMinutes: number | null): string => {
  if (totalMinutes == null) return "0";
  return Number((totalMinutes / 60).toFixed(2)).toString();
};

// An actual check-in always takes priority over an approved leave on the
// same day (e.g. they came in anyway).
const cellStateFor = (record: AttendanceRecord | undefined, isOnLeave: boolean): CellState => {
  if (record) return record.status ?? "checked-in";
  if (isOnLeave) return "on-leave";
  return "none";
};

const EmployeeAttendanceCalendar = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaveDates, setLeaveDates] = useState<Set<string>>(new Set());
  const [leaveUserName, setLeaveUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    const load = async () => {
      if (!userId) return;

      setLoading(true);
      const numericUserId = Number(userId);
      const [recordList, leaveRequests] = await Promise.all([
        getAttendanceRecords({ userId: numericUserId }),
        getLeaveRequests({ userId: numericUserId, status: "approved" }),
      ]);

      setRecords(recordList);

      const dates = new Set<string>();
      for (const leave of leaveRequests) {
        for (const date of expandDateRange(leave.startDate, leave.endDate)) dates.add(date);
      }
      setLeaveDates(dates);
      setLeaveUserName(leaveRequests[0]?.user?.name ?? null);

      setLoading(false);
    };

    load();
  }, [userId]);

  const employee = records[0]?.user ?? null;
  const employeeName = employee?.name ?? leaveUserName ?? "Unknown Employee";

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const record of records) map.set(record.date, record);
    return map;
  }, [records]);

  const calendarCells = useMemo(() => {
    const { year, month } = cursor;
    const firstDayWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [
      ...Array(firstDayWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [cursor]);

  type SummaryState = Exclude<CellState, "none" | "checked-in">;

  const monthSummary = useMemo<Record<SummaryState, number>>(() => {
    const { year, month } = cursor;
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

    const tally = records.filter((record) => record.date.startsWith(prefix)).reduce(
      (acc, record) => {
        const state = cellStateFor(record, false);
        if (state !== "none" && state !== "checked-in") acc[state] += 1;
        return acc;
      },
      { present: 0, late: 0, "half-day": 0, absent: 0, "on-leave": 0 } as Record<SummaryState, number>,
    );

    const recordedDates = new Set(records.map((record) => record.date));
    for (const date of leaveDates) {
      if (date.startsWith(prefix) && !recordedDates.has(date)) tally["on-leave"] += 1;
    }

    return tally;
  }, [records, cursor, leaveDates]);

  const goToMonth = (direction: -1 | 1) => {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + direction, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const goToToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  const today = new Date();
  const isCurrentMonth =
    cursor.year === today.getFullYear() && cursor.month === today.getMonth();

  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate("/app/attendance")}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Back to Attendance
      </button>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
          Loading calendar...
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-base font-semibold text-white ring-1 ring-white/20">
                  {employeeName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-white sm:text-lg">
                    {employeeName}
                  </p>
                  <p className="text-xs text-slate-300">
                    {employee?.department ?? "No department"}
                    {employee?.teams && employee.teams.length > 0
                      ? ` · ${employee.teams.join(", ")}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center overflow-hidden rounded-lg border border-white/20 bg-white/10">
                  <button
                    type="button"
                    onClick={() => goToMonth(-1)}
                    className="px-2.5 py-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="h-5 w-px bg-white/20" />
                  <button
                    type="button"
                    onClick={goToToday}
                    className="whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
                  >
                    {monthNames[cursor.month]} {cursor.year}
                  </button>
                  <div className="h-5 w-px bg-white/20" />
                  <button
                    type="button"
                    onClick={() => goToMonth(1)}
                    className="px-2.5 py-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                    aria-label="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Month summary + legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 sm:px-7">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {legendItems.map((state) => (
                <div key={state} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${cellStyles[state].dot}`} />
                  <span className="text-xs text-slate-500">
                    {statusLabels[state]}
                    {state !== "checked-in" && (
                      <span className="ml-1 font-semibold text-slate-700">
                        {monthSummary[state]}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CalendarDays size={13} />
              {monthNames[cursor.month]} {cursor.year}
            </div>
          </div>

          <div className="overflow-x-auto p-4 sm:p-6">
            <div className="min-w-[700px]">
              {/* Week Day Labels */}
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="mt-1 grid grid-cols-7 gap-2">
                {calendarCells.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="min-h-[96px]" />;
                  }

                  const dateKey = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
                  const record = recordsByDate.get(dateKey);
                  const state = cellStateFor(record, leaveDates.has(dateKey));
                  const styles = cellStyles[state];

                  const isToday = isCurrentMonth && day === today.getDate();

                  const rangeLabel = record
                    ? `${formatTime12(record.checkInAt)}${
                        record.checkOutAt ? ` - ${formatTime12(record.checkOutAt)}` : ""
                      }`
                    : null;

                  return (
                    <div
                      key={dateKey}
                      className={`flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${styles.cell} ${
                        isToday ? "ring-2 ring-slate-900 ring-offset-1" : ""
                      }`}
                    >
                      <p className={`text-sm font-semibold ${styles.day}`}>{day}</p>

                      {rangeLabel && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight ${styles.badge}`}
                        >
                          {rangeLabel}
                        </span>
                      )}

                      {!record && state === "on-leave" && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight ${styles.badge}`}
                        >
                          <PlaneTakeoff size={10} />
                          On Leave
                        </span>
                      )}

                      {record && (
                        <p className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock3 size={11} />
                          {formatHours(record.totalMinutes)}h
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendanceCalendar;
