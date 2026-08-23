import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, CalendarDays, Clock3, Search, UserCheck, UserX } from "lucide-react";
import {
  formatDuration,
  getAttendanceRecords,
} from "../../services/attendanceService";
import { getEmployees } from "../../services/employeeService";
import { getProjects } from "../../services/projectService";
import type { AttendanceRecord, AttendanceStatus } from "../../types/attendance";
import type { Employee } from "../../types/employee";
import type { Project } from "../../types/project";

const statusStyles: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-600",
  late: "bg-orange-50 text-orange-600",
  "half-day": "bg-amber-50 text-amber-600",
  absent: "bg-red-50 text-red-600",
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  "half-day": "Half Day",
  absent: "Absent",
};

const Attendance = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      const [recordList, employeeList, projectList] = await Promise.all([
        getAttendanceRecords(),
        getEmployees(),
        getProjects(),
      ]);

      setRecords(recordList);
      setEmployees(employeeList);
      setProjects(projectList);
      setLoading(false);
    };

    load();
  }, []);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const employee of employees) map.set(employee.id, employee);
    return map;
  }, [employees]);

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const project of projects) map.set(String(project.id), project);
    return map;
  }, [projects]);

  const availableDates = useMemo(() => {
    return [...new Set(records.map((record) => record.date))].sort(
      (a, b) => b.localeCompare(a),
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesDate = dateFilter === "all" || record.date === dateFilter;

      const employeeName = employeeMap.get(record.employeeId)?.name ?? "";
      const matchesSearch =
        !term || employeeName.toLowerCase().includes(term);

      return matchesDate && matchesSearch;
    });
  }, [records, search, dateFilter, employeeMap]);

  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (acc, record) => {
        acc[record.status] += 1;
        return acc;
      },
      { present: 0, late: 0, "half-day": 0, absent: 0 } as Record<AttendanceStatus, number>,
    );
  }, [filteredRecords]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">
          Attendance calculated from daily project contributions.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Present</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {summary.present}
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <UserCheck size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Late</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {summary.late}
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 p-2.5 text-orange-600">
              <Clock3 size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Half Day</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {summary["half-day"]}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <Clock3 size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Absent</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {summary.absent}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-2.5 text-red-600">
              <UserX size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by employee name"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="relative">
          <CalendarCheck
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Dates</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employee
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Projects
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total Duration
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading attendance...
                  </td>
                </tr>
              )}

              {!loading && filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <CalendarCheck size={22} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No attendance records found
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRecords.map((record) => {
                  const employee = employeeMap.get(record.employeeId);

                  return (
                    <tr
                      key={`${record.employeeId}-${record.date}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                            {(employee?.name ?? "?").charAt(0).toUpperCase()}
                          </div>

                          <span className="text-sm font-medium text-slate-800">
                            {employee?.name ?? "Unknown"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {record.date}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {record.projectIds.map((projectId) => (
                            <span
                              key={projectId}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                            >
                              {projectMap.get(projectId)?.name ?? "Unknown"}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {formatDuration(record.totalMinutes)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[record.status]}`}
                        >
                          {statusLabels[record.status]}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          to={`/app/attendance/${record.employeeId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          aria-label={`View calendar for ${employee?.name ?? "employee"}`}
                        >
                          <CalendarDays size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
