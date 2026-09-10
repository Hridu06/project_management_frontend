import { useEffect, useMemo, useState } from "react";
import { Check, Search, X, CalendarDays, Settings2 } from "lucide-react";
import {
  approveLeave,
  getLeaveQuotas,
  getLeaveRequests,
  managerApproveLeave,
  managerRejectLeave,
  rejectLeave,
  updateLeaveQuotas,
} from "../../services/leaveService";
import { useAuth } from "../../context/AuthContext";
import type { LeaveQuotas, LeaveRequest, LeaveStatus, LeaveType } from "../../types/leave";

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

const typeLabels: Record<LeaveType, string> = {
  sick: "Sick Leave",
  casual: "Casual Leave",
  annual: "Annual Leave",
  unpaid: "Unpaid Leave",
};

const Leave = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");

  const [quotas, setQuotas] = useState<LeaveQuotas>({ sick: 0, casual: 0, annual: 0 });
  const [quotasOpen, setQuotasOpen] = useState(false);
  const [savingQuotas, setSavingQuotas] = useState(false);

  const load = async () => {
    const [requestList, quotaData] = await Promise.all([getLeaveRequests(), getLeaveQuotas()]);
    setRequests(requestList);
    setQuotas(quotaData);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const employeeName = request.user?.name ?? "";
      const matchesSearch = !term || employeeName.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  const summary = useMemo(() => {
    return requests.reduce(
      (acc, request) => {
        acc[request.status] += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, cancelled: 0 } as Record<LeaveStatus, number>,
    );
  }, [requests]);

  const replaceRequest = (updated: LeaveRequest) => {
    setRequests((prev) => prev.map((request) => (request.id === updated.id ? updated : request)));
  };

  const handleManagerApprove = async (id: number) => {
    setProcessingId(id);
    try {
      replaceRequest(await managerApproveLeave(id));
    } finally {
      setProcessingId(null);
    }
  };

  const handleManagerReject = async (id: number) => {
    const note = window.prompt("Reason for rejecting this leave request?");
    if (!note) return;

    setProcessingId(id);
    try {
      replaceRequest(await managerRejectLeave(id, note));
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      replaceRequest(await approveLeave(id));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: number) => {
    const note = window.prompt("Reason for rejecting this leave request?");
    if (!note) return;

    setProcessingId(id);
    try {
      replaceRequest(await rejectLeave(id, note));
    } finally {
      setProcessingId(null);
    }
  };

  const handleSaveQuotas = async () => {
    setSavingQuotas(true);
    try {
      setQuotas(await updateLeaveQuotas(quotas));
      setQuotasOpen(false);
    } finally {
      setSavingQuotas(false);
    }
  };

  // What action (if any) the signed-in role can take on this row right now.
  const actionFor = (request: LeaveRequest): "manager" | "admin" | null => {
    if (request.status !== "pending") return null;

    if (!isAdmin && request.manager?.id === user?.id && request.managerAction === null) {
      return "manager";
    }

    if (isAdmin && (!request.manager || request.managerAction === "approved")) {
      return "admin";
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and decide on employee leave requests.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setQuotasOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Settings2 size={16} />
            Leave Quotas
          </button>
        )}
      </div>

      {isAdmin && quotasOpen && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-700">
            Annual leave quota per employee (unpaid leave is unlimited)
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            {(["sick", "casual", "annual"] as const).map((type) => (
              <div key={type}>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  {typeLabels[type]}
                </label>
                <input
                  type="number"
                  min={0}
                  value={quotas[type]}
                  onChange={(event) =>
                    setQuotas((prev) => ({ ...prev, [type]: Number(event.target.value) }))
                  }
                  className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleSaveQuotas}
              disabled={savingQuotas}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {savingQuotas ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.pending}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Approved</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.approved}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Rejected</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.rejected}</p>
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

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as LeaveStatus | "all")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employee
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manager
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
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading leave requests...
                  </td>
                </tr>
              )}

              {!loading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <CalendarDays size={22} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No leave requests found
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRequests.map((request) => {
                  const action = actionFor(request);

                  return (
                    <tr key={request.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                            {(request.user?.name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-800">
                            {request.user?.name ?? "Unknown"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {typeLabels[request.type]}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        <p>
                          {request.startDate}
                          {request.endDate !== request.startDate ? ` → ${request.endDate}` : ""}
                        </p>
                        <p className="text-xs text-slate-400">
                          {request.days} day{request.days === 1 ? "" : "s"}
                          {request.isHalfDay ? " (half day)" : ""}
                        </p>
                      </td>

                      <td className="max-w-[220px] px-6 py-4 text-sm text-slate-600">
                        <p className="line-clamp-2">{request.reason}</p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {request.manager ? (
                          <div>
                            <p>{request.manager.name}</p>
                            {request.managerAction && (
                              <span
                                className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                  request.managerAction === "approved"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-red-50 text-red-600"
                                }`}
                              >
                                {request.managerAction === "approved" ? "Approved" : "Rejected"}
                              </span>
                            )}
                            {!request.managerAction && request.status === "pending" && (
                              <span className="mt-0.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                                Awaiting review
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No manager</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[request.status]}`}
                        >
                          {statusLabels[request.status]}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {action ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={processingId === request.id}
                              onClick={() =>
                                action === "manager"
                                  ? handleManagerApprove(request.id)
                                  : handleApprove(request.id)
                              }
                              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                              aria-label={`Approve leave for ${request.user?.name}`}
                            >
                              <Check size={16} />
                            </button>

                            <button
                              type="button"
                              disabled={processingId === request.id}
                              onClick={() =>
                                action === "manager"
                                  ? handleManagerReject(request.id)
                                  : handleReject(request.id)
                              }
                              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              aria-label={`Reject leave for ${request.user?.name}`}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-slate-400">
                            {request.status === "pending" ? "Waiting for manager" : "—"}
                          </span>
                        )}
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

export default Leave;
