import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, Search } from "lucide-react";
import {
  formatDuration,
  getAttendanceRecords,
} from "../../services/attendanceService";
import type { AttendanceRecord } from "../../types/attendance";

interface EmployeeSummary {
  userId: number;
  name: string;
  recordedDays: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  totalMinutes: number;
  attendanceRate: number;
}

const Reports = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const load = async () => {
      const recordList = await getAttendanceRecords();

      setRecords(recordList);

      if (recordList.length > 0) {
        const dates = recordList.map((record) => record.date).sort();
        setFromDate(dates[0]);
        setToDate(dates[dates.length - 1]);
      }

      setLoading(false);
    };

    load();
  }, []);

  const recordsInRange = useMemo(() => {
    return records.filter((record) => {
      if (fromDate && record.date < fromDate) return false;
      if (toDate && record.date > toDate) return false;
      return true;
    });
  }, [records, fromDate, toDate]);

  const summaries = useMemo(() => {
    const map = new Map<number, EmployeeSummary>();

    for (const record of recordsInRange) {
      if (!record.user) continue;

      const existing = map.get(record.user.id) ?? {
        userId: record.user.id,
        name: record.user.name,
        recordedDays: 0,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        totalMinutes: 0,
        attendanceRate: 0,
      };

      existing.totalMinutes += record.totalMinutes ?? 0;

      // A record with no status yet is still checked in today — leave it
      // out of the day tallies until it resolves to a final outcome.
      if (record.status === "present" || record.status === "late") {
        existing.recordedDays += 1;
        existing.presentDays += 1;
      } else if (record.status === "half-day") {
        existing.recordedDays += 1;
        existing.halfDays += 1;
      } else if (record.status === "absent") {
        existing.recordedDays += 1;
        existing.absentDays += 1;
      }

      map.set(record.user.id, existing);
    }

    const list = [...map.values()].map((summary) => ({
      ...summary,
      attendanceRate:
        summary.recordedDays === 0
          ? 0
          : ((summary.presentDays + summary.halfDays * 0.5) /
              summary.recordedDays) *
            100,
    }));

    const term = search.trim().toLowerCase();

    return list
      .filter((summary) => !term || summary.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [recordsInRange, search]);

  const handleExport = () => {
    const header = [
      "Employee",
      "Recorded Days",
      "Present",
      "Half Day",
      "Absent",
      "Total Hours",
      "Attendance Rate (%)",
    ];

    const rows = summaries.map((summary) => [
      summary.name,
      summary.recordedDays,
      summary.presentDays,
      summary.halfDays,
      summary.absentDays,
      formatDuration(summary.totalMinutes),
      summary.attendanceRate.toFixed(1),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-report-${fromDate}-to-${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Attendance and contribution summary by employee.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={loading || summaries.length === 0}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <Download size={16} />
          Export CSV
        </button>
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

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <span className="text-sm text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employee
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recorded Days
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Present
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Half Day
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Absent
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Attendance Rate
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading report...
                  </td>
                </tr>
              )}

              {!loading && summaries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <BarChart3 size={22} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No data for the selected range
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                summaries.map((summary) => (
                  <tr
                    key={summary.userId}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                          {summary.name.charAt(0).toUpperCase()}
                        </div>

                        <span className="text-sm font-medium text-slate-800">
                          {summary.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {summary.recordedDays}
                    </td>

                    <td className="px-6 py-4 text-sm text-emerald-600">
                      {summary.presentDays}
                    </td>

                    <td className="px-6 py-4 text-sm text-amber-600">
                      {summary.halfDays}
                    </td>

                    <td className="px-6 py-4 text-sm text-red-600">
                      {summary.absentDays}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatDuration(summary.totalMinutes)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${summary.attendanceRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600">
                          {summary.attendanceRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
