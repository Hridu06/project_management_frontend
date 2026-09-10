import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, PlaneTakeoff, Send, X } from "lucide-react";
import {
  applyLeave,
  cancelLeave,
  getLeaveBalances,
  getLeaveRequests,
} from "../../services/leaveService";
import type { LeaveBalance, LeaveRequest, LeaveStatus, LeaveType } from "../../types/leave";

const typeLabels: Record<LeaveType, string> = {
  sick: "Sick Leave",
  casual: "Casual Leave",
  annual: "Annual Leave",
  unpaid: "Unpaid Leave",
};

const statusStyles: Record<LeaveStatus, string> = {
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-emerald-50 text-emerald-600",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-slate-100 text-slate-500",
};

const statusLabels: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const todayDateKey = (): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const EmployeeLeave = () => {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [type, setType] = useState<LeaveType>("casual");
  const [startDate, setStartDate] = useState(todayDateKey());
  const [endDate, setEndDate] = useState(todayDateKey());
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [balanceList, requestList] = await Promise.all([
      getLeaveBalances(),
      getLeaveRequests(),
    ]);
    setBalances(balanceList);
    setRequests(requestList);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (endDate < startDate) {
      setError("End date can't be before the start date.");
      return;
    }

    setSubmitting(true);
    try {
      await applyLeave({
        type,
        startDate,
        endDate,
        isHalfDay: isHalfDay && startDate === endDate,
        reason,
      });
      setReason("");
      setIsHalfDay(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    setProcessingId(id);
    try {
      const updated = await cancelLeave(id);
      setRequests((prev) => prev.map((request) => (request.id === id ? updated : request)));
    } finally {
      setProcessingId(null);
    }
  };

  const canCancel = (request: LeaveRequest) =>
    request.status === "pending" ||
    (request.status === "approved" && request.startDate > todayDateKey());

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Leave</h1>
        <p className="mt-1 text-sm text-slate-500">
          Apply for leave and track the status of your requests.
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {balances.map((balance) => (
          <div key={balance.type} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <PlaneTakeoff size={15} className="text-amber-500" />
              <p className="text-xs text-slate-500">{typeLabels[balance.type]}</p>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {balance.remaining ?? "∞"}
              <span className="ml-1 text-xs font-normal text-slate-400">
                / {balance.quota ?? "∞"} left
              </span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{balance.used} used this year</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Apply Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 xl:col-span-1">
          <h2 className="text-base font-semibold text-slate-900">Apply for Leave</h2>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as LeaveType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {(Object.keys(typeLabels) as LeaveType[]).map((value) => (
                  <option key={value} value={value}>
                    {typeLabels[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Start Date
                </label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    if (event.target.value > endDate) setEndDate(event.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  End Date
                </label>
                <input
                  required
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {startDate === endDate && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(event) => setIsHalfDay(event.target.checked)}
                  className="rounded border-slate-300"
                />
                Half day
              </label>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Reason</label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Briefly describe the reason for leave"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              <Send size={15} />
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>

        {/* My Requests */}
        <div className="rounded-xl border border-slate-200 bg-white xl:col-span-2">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">My Requests</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Duration
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
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                      Loading requests...
                    </td>
                  </tr>
                )}

                {!loading && requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-14">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <CalendarDays size={22} className="text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">
                          No leave requests yet
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  requests.map((request) => (
                    <tr key={request.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {typeLabels[request.type]}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        <p>
                          {request.startDate}
                          {request.endDate !== request.startDate
                            ? ` → ${request.endDate}`
                            : ""}
                        </p>
                        <p className="text-xs text-slate-400">
                          {request.days} day{request.days === 1 ? "" : "s"}
                          {request.isHalfDay ? " (half day)" : ""}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[request.status]}`}
                        >
                          {statusLabels[request.status]}
                        </span>
                        {request.status === "rejected" && request.decisionNote && (
                          <p className="mt-1 max-w-[200px] text-xs text-slate-400">
                            {request.decisionNote}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {canCancel(request) ? (
                          <button
                            type="button"
                            disabled={processingId === request.id}
                            onClick={() => handleCancel(request.id)}
                            className="inline-flex items-center gap-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            aria-label="Cancel leave request"
                          >
                            <X size={16} />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeave;
