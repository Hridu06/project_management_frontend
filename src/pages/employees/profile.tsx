import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  FolderKanban,
  Mail,
  Pencil,
  Phone,
  PlaneTakeoff,
  UserCheck,
  UserCircle,
  X,
} from "lucide-react";
import { getEmployees, updateEmployee } from "../../services/employeeService";
import { getProjects } from "../../services/projectService";
import { getContributions } from "../../services/contributionService";
import { getAttendanceRecords, formatDuration } from "../../services/attendanceService";
import { getLeaveRequests, countLeaveDays } from "../../services/leaveService";
import type { Employee } from "../../types/employee";
import type { Project } from "../../types/project";
import type { AttendanceRecord, AttendanceStatus, Contribution } from "../../types/attendance";
import type { LeaveRequest, LeaveStatus } from "../../types/leave";
import type { UserRole } from "../../types/user";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

const attendanceStatusStyles: Record<AttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-600",
  late: "bg-orange-50 text-orange-600",
  "half-day": "bg-amber-50 text-amber-600",
  absent: "bg-red-50 text-red-600",
};

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  "half-day": "Half Day",
  absent: "Absent",
};

const leaveStatusStyles: Record<LeaveStatus, string> = {
  approved: "bg-emerald-50 text-emerald-600",
  pending: "bg-amber-50 text-amber-600",
  rejected: "bg-red-50 text-red-600",
};

const leaveStatusLabels: Record<LeaveStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
};

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const EmployeeProfile = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!employeeId) return;

      const [employeeList, projectList, contributionList, attendanceList, leaveList] =
        await Promise.all([
          getEmployees(),
          getProjects(),
          getContributions(),
          getAttendanceRecords(),
          getLeaveRequests(),
        ]);

      const found = employeeList.find((item) => item.id === employeeId) ?? null;

      setEmployee(found);
      setProjects(projectList);
      setContributions(contributionList.filter((item) => item.employeeId === employeeId));
      setAttendanceRecords(
        attendanceList.filter((record) => record.employeeId === employeeId),
      );
      setLeaveRequests(leaveList.filter((item) => item.employeeId === employeeId));

      if (found) {
        setPersonalForm({ name: found.name, email: found.email, phone: found.phone });
      }

      setLoading(false);
    };

    load();
  }, [employeeId]);

  const assignedProjects = useMemo(() => {
    if (!employee) return [];
    return projects.filter((project) => project.employeeIds.includes(employee.id));
  }, [projects, employee]);

  const projectContributions = useMemo(() => {
    return assignedProjects.map((project) => {
      const items = contributions.filter((item) => item.projectId === project.id);
      const totalMinutes = items.reduce(
        (sum, item) => sum + Math.max(toMinutes(item.endTime) - toMinutes(item.startTime), 0),
        0,
      );

      return {
        project,
        entries: items.length,
        totalMinutes,
      };
    });
  }, [assignedProjects, contributions]);

  const attendanceSummary = useMemo(() => {
    return attendanceRecords.reduce(
      (acc, record) => {
        acc[record.status] += 1;
        acc.totalMinutes += record.totalMinutes;
        return acc;
      },
      { present: 0, late: 0, "half-day": 0, absent: 0, totalMinutes: 0 } as Record<
        AttendanceStatus,
        number
      > & { totalMinutes: number },
    );
  }, [attendanceRecords]);

  const leaveSummary = useMemo(() => {
    const approvedDays = leaveRequests
      .filter((item) => item.status === "approved")
      .reduce((sum, item) => sum + countLeaveDays(item.startDate, item.endDate), 0);

    const pending = leaveRequests.filter((item) => item.status === "pending").length;
    const rejected = leaveRequests.filter((item) => item.status === "rejected").length;

    return { approvedDays, pending, rejected };
  }, [leaveRequests]);

  const startPersonalEdit = () => {
    if (!employee) return;
    setPersonalForm({ name: employee.name, email: employee.email, phone: employee.phone });
    setEditingPersonal(true);
  };

  const cancelPersonalEdit = () => {
    if (!employee) return;
    setPersonalForm({ name: employee.name, email: employee.email, phone: employee.phone });
    setEditingPersonal(false);
  };

  const handlePersonalSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!employee) return;

    setSaving(true);

    const updated = await updateEmployee(employee.id, {
      name: personalForm.name,
      email: personalForm.email,
      phone: personalForm.phone,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      role: employee.role,
      joinDate: employee.joinDate,
      status: employee.status,
      avatarFile: null,
    });

    setEmployee(updated);
    setSaving(false);
    setEditingPersonal(false);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
        Loading employee profile...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/app/employees")}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Back to Employees
        </button>

        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
          Employee not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate("/app/employees")}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
      >
        <ArrowLeft size={16} />
        Back to Employees
      </button>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-600">
                {employee.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="text-xl font-bold text-slate-900">{employee.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {employee.designation} · {employee.department}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Role: {roleLabels[employee.role]} · Joined {employee.joinDate}
              </p>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              employee.status === "active"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {employee.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <StatCard
            icon={<FolderKanban size={18} className="text-violet-500" />}
            label="Projects"
            value={String(assignedProjects.length)}
            bg="bg-violet-50"
          />
          <StatCard
            icon={<Clock3 size={18} className="text-blue-500" />}
            label="Total Hours"
            value={formatDuration(attendanceSummary.totalMinutes)}
            bg="bg-blue-50"
          />
          <StatCard
            icon={<UserCheck size={18} className="text-emerald-500" />}
            label="Present Days"
            value={String(attendanceSummary.present)}
            bg="bg-emerald-50"
          />
          <StatCard
            icon={<Clock3 size={18} className="text-orange-500" />}
            label="Late Days"
            value={String(attendanceSummary.late)}
            bg="bg-orange-50"
          />
          <StatCard
            icon={<PlaneTakeoff size={18} className="text-amber-500" />}
            label="Leave Days"
            value={String(leaveSummary.approvedDays)}
            bg="bg-amber-50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Personal Info (editable) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                <UserCircle size={20} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Personal Info</h2>
                <p className="text-sm text-slate-500">Editable contact details.</p>
              </div>
            </div>

            {!editingPersonal && (
              <button
                type="button"
                onClick={startPersonalEdit}
                className="flex items-center gap-1.5 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                aria-label="Edit personal info"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>

          {editingPersonal ? (
            <form className="mt-5 space-y-4" onSubmit={handlePersonalSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={personalForm.name}
                  onChange={(event) =>
                    setPersonalForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={personalForm.email}
                  onChange={(event) =>
                    setPersonalForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <input
                  type="text"
                  value={personalForm.phone}
                  onChange={(event) =>
                    setPersonalForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  <Check size={16} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={cancelPersonalEdit}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5 space-y-3">
              <p className="flex items-center gap-2.5 text-sm text-slate-700">
                <Mail size={15} className="shrink-0 text-slate-400" />
                {employee.email}
              </p>
              <p className="flex items-center gap-2.5 text-sm text-slate-700">
                <Phone size={15} className="shrink-0 text-slate-400" />
                {employee.phone || "Not provided"}
              </p>
            </div>
          )}
        </div>

        {/* Work Info (read-only) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600">
              <FolderKanban size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Work Info</h2>
              <p className="text-sm text-slate-500">
                Managed from the Employees list — read-only here.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Department
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{employee.department}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Designation
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{employee.designation}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Role
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {roleLabels[employee.role]}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Join Date
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{employee.joinDate}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {employee.status === "active" ? "Active" : "Inactive"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Projects & Contribution */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Projects & Contribution</h2>
          <p className="mt-1 text-sm text-slate-500">
            Projects this employee works on and their logged contribution.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Project
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Entries
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contribution
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {projectContributions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                    Not assigned to any project yet.
                  </td>
                </tr>
              )}

              {projectContributions.map(({ project, entries, totalMinutes }) => (
                <tr key={project.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-6 py-4">
                    <Link
                      to={`/app/projects/${project.id}`}
                      className="text-sm font-medium text-slate-800 hover:text-blue-600 hover:underline"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{entries}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">
                    {formatDuration(totalMinutes)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                      {project.status.replace("-", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Attendance */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Attendance</h2>
              <p className="mt-1 text-sm text-slate-500">Recent daily records.</p>
            </div>
            <Link
              to={`/app/attendance/${employee.id}`}
              className="flex items-center gap-1.5 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
              aria-label="View attendance calendar"
              title="View attendance calendar"
            >
              <CalendarDays size={16} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {attendanceRecords.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                      No attendance records yet.
                    </td>
                  </tr>
                )}

                {attendanceRecords.slice(0, 8).map((record) => (
                  <tr
                    key={record.date}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-6 py-4 text-sm text-slate-600">{record.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatDuration(record.totalMinutes)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${attendanceStatusStyles[record.status]}`}
                      >
                        {attendanceStatusLabels[record.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leave */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Leave</h2>
            <p className="mt-1 text-sm text-slate-500">
              {leaveSummary.approvedDays} approved day
              {leaveSummary.approvedDays === 1 ? "" : "s"} · {leaveSummary.pending} pending ·{" "}
              {leaveSummary.rejected} rejected
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Days
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-400">
                      No leave requests yet.
                    </td>
                  </tr>
                )}

                {leaveRequests.map((leave) => (
                  <tr key={leave.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {leave.startDate === leave.endDate
                        ? leave.startDate
                        : `${leave.startDate} - ${leave.endDate}`}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {countLeaveDays(leave.startDate, leave.endDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${leaveStatusStyles[leave.status]}`}
                      >
                        {leaveStatusLabels[leave.status]}
                      </span>
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

const StatCard = ({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) => (
  <div className={`rounded-lg ${bg} p-3`}>
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs text-slate-500">{label}</span>
    </div>
    <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
  </div>
);

export default EmployeeProfile;
