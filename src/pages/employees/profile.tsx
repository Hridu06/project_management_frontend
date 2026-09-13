import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FolderKanban,
  ListChecks,
  Mail,
  Pencil,
  Phone,
  PlaneTakeoff,
  Printer,
  UserCircle,
  X,
} from "lucide-react";
import ImagePreviewModal from "../../components/common/ImagePreviewModal";
import { getEmployees, updateEmployee } from "../../services/employeeService";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getAttendanceRecords, formatDuration } from "../../services/attendanceService";
import { getLeaveRequests } from "../../services/leaveService";
import type { Employee } from "../../types/employee";
import type { Project } from "../../types/project";
import type { Task } from "../../types/task";
import type { AttendanceRecord, AttendanceStatus } from "../../types/attendance";
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
  cancelled: "bg-slate-100 text-slate-500",
};

const leaveStatusLabels: Record<LeaveStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// CV-style print styles for the printable resume view
const printStyles = `
  @media print {
    body {
      background: white !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    .cv-page {
      color: #0f172a !important;
    }

    .cv-header {
      display: flex !important;
      align-items: center !important;
      gap: 18px !important;
      padding-bottom: 16px !important;
      border-bottom: 3px solid #2563eb !important;
      margin-bottom: 18px !important;
    }

    .cv-avatar {
      width: 72px !important;
      height: 72px !important;
      border-radius: 999px !important;
      object-fit: cover !important;
      border: 2px solid #e2e8f0 !important;
    }

    .cv-avatar-fallback {
      width: 72px !important;
      height: 72px !important;
      border-radius: 999px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      background: #dbeafe !important;
      color: #2563eb !important;
      font-size: 26px !important;
      font-weight: 700 !important;
    }

    .cv-name {
      font-size: 22px !important;
      font-weight: 700 !important;
      margin: 0 !important;
      color: #0f172a !important;
    }

    .cv-role {
      font-size: 13px !important;
      color: #475569 !important;
      margin: 3px 0 0 0 !important;
    }

    .cv-contact {
      margin-top: 6px !important;
      display: flex !important;
      gap: 14px !important;
      font-size: 11px !important;
      color: #64748b !important;
    }

    .cv-status {
      margin-left: auto !important;
      align-self: flex-start !important;
      font-size: 10px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.4px !important;
      padding: 4px 10px !important;
      border-radius: 999px !important;
      background: #d1fae5 !important;
      color: #065f46 !important;
    }

    .cv-status.inactive {
      background: #f1f5f9 !important;
      color: #64748b !important;
    }

    .cv-section {
      margin-bottom: 16px !important;
      page-break-inside: avoid !important;
    }

    .cv-section-title {
      font-size: 12px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.6px !important;
      color: #2563eb !important;
      border-bottom: 1px solid #e2e8f0 !important;
      padding-bottom: 5px !important;
      margin-bottom: 10px !important;
    }

    .cv-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px 24px !important;
    }

    .cv-field .label {
      display: block !important;
      color: #94a3b8 !important;
      font-size: 9px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.4px !important;
      margin-bottom: 2px !important;
    }

    .cv-field .value {
      display: block !important;
      color: #0f172a !important;
      font-size: 12px !important;
      font-weight: 600 !important;
    }

    .cv-project-list {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 11px !important;
    }

    .cv-project-list th {
      text-align: left !important;
      color: #94a3b8 !important;
      font-size: 9px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.4px !important;
      padding: 4px 8px !important;
      border-bottom: 1px solid #e2e8f0 !important;
    }

    .cv-project-list td {
      padding: 6px 8px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      color: #1e293b !important;
    }

    .cv-empty {
      font-size: 11px !important;
      color: #94a3b8 !important;
      font-style: italic !important;
    }

    .cv-footer {
      margin-top: 20px !important;
      padding-top: 10px !important;
      border-top: 1px solid #e2e8f0 !important;
      font-size: 9px !important;
      color: #94a3b8 !important;
      text-align: center !important;
    }

    @page {
      margin: 14mm 16mm !important;
    }
  }
`;

const EmployeeProfile = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!employeeId) return;

      const [employeeList, projectList] = await Promise.all([
        getEmployees(),
        getProjects(),
      ]);

      const found = employeeList.find((item) => item.id === employeeId) ?? null;

      setEmployee(found);
      setProjects(projectList);
      // Attendance and leave are keyed by the linked login account, not the
      // Employee directory id, so they're fetched separately once we know
      // the userId.
      setAttendanceRecords(
        found?.userId != null ? await getAttendanceRecords({ userId: found.userId }) : [],
      );
      setLeaveRequests(
        found?.userId != null ? await getLeaveRequests({ userId: found.userId }) : [],
      );

      if (found) {
        setPersonalForm({ name: found.name, email: found.email, phone: found.phone });

        // Real, live task data for this employee — requires their linked
        // user account id (assigned_to on tasks is a users.id, not the
        // employees.id used in the route param above).
        setTasks(found.userId ? await getTasks({ assignedTo: found.userId }) : []);
      }

      setLoading(false);
    };

    load();
  }, [employeeId]);

  const assignedProjects = useMemo(() => {
    if (!employee) return [];
    return projects.filter((project) =>
      project.members.some((member) => member.email === employee.email),
    );
  }, [projects, employee]);

  const taskCompletedCount = useMemo(
    () => tasks.filter((task) => task.status === "completed").length,
    [tasks],
  );

  const projectContributions = useMemo(() => {
    return assignedProjects.map((project) => {
      const items = tasks.filter((task) => task.projectId === project.id);
      const completed = items.filter((task) => task.status === "completed").length;

      return {
        project,
        entries: items.length,
        completed,
      };
    });
  }, [assignedProjects, tasks]);

  const attendanceSummary = useMemo(() => {
    return attendanceRecords.reduce(
      (acc, record) => {
        if (record.status) acc[record.status] += 1;
        acc.totalMinutes += record.totalMinutes ?? 0;
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
      .reduce((sum, item) => sum + item.days, 0);

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

  const handlePrint = () => {
    const originalTitle = document.title;
    const fileName = `${employee.name.trim().replace(/\s+/g, "_")}_CV`;

    document.title = fileName;

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);

    window.print();
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
    <>
      {/* Print Styles */}
      <style>{printStyles}</style>

      <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => navigate("/app/employees")}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Back to Employees
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 print:hidden">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            {employee.avatar ? (
              <button
                type="button"
                onClick={() => setPreviewImage(employee.avatar)}
                className="shrink-0 rounded-full"
              >
                <img
                  src={employee.avatar}
                  alt={employee.name}
                  className="h-14 w-14 cursor-pointer rounded-full object-cover transition-opacity hover:opacity-90"
                />
              </button>
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
            icon={<ListChecks size={18} className="text-blue-500" />}
            label="Total Tasks"
            value={String(tasks.length)}
            bg="bg-blue-50"
          />
          <StatCard
            icon={<CheckCircle2 size={18} className="text-emerald-500" />}
            label="Completed Tasks"
            value={String(taskCompletedCount)}
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 print:hidden">
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
      <div className="rounded-xl border border-slate-200 bg-white print:hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Projects & Contribution</h2>
          <p className="mt-1 text-sm text-slate-500">
            Projects this employee works on and their live task progress.
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
                  Tasks
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Completed
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

              {projectContributions.map(({ project, entries, completed }) => (
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
                    {completed}/{entries}
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 print:hidden">
        {/* Attendance */}
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Attendance</h2>
              <p className="mt-1 text-sm text-slate-500">Recent daily records.</p>
            </div>
            {employee.userId != null && (
              <Link
                to={`/app/attendance/${employee.userId}`}
                className="flex items-center gap-1.5 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                aria-label="View attendance calendar"
                title="View attendance calendar"
              >
                <CalendarDays size={16} />
              </Link>
            )}
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
                    key={record.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-6 py-4 text-sm text-slate-600">{record.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatDuration(record.totalMinutes)}
                    </td>
                    <td className="px-6 py-4">
                      {record.status ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${attendanceStatusStyles[record.status]}`}
                        >
                          {attendanceStatusLabels[record.status]}
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                          Checked In
                        </span>
                      )}
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
                      {leave.days}
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

      {/* Print-only CV */}
      <div className="hidden print:block cv-page">
        <div className="cv-header">
          {employee.avatar ? (
            <img src={employee.avatar} alt={employee.name} className="cv-avatar" />
          ) : (
            <div className="cv-avatar-fallback">{employee.name.charAt(0).toUpperCase()}</div>
          )}

          <div>
            <h1 className="cv-name">{employee.name}</h1>
            <p className="cv-role">
              {employee.designation} · {employee.department}
            </p>
            <div className="cv-contact">
              <span>{employee.email}</span>
              <span>{employee.phone || "Not provided"}</span>
            </div>
          </div>

          <span className={`cv-status ${employee.status === "active" ? "" : "inactive"}`}>
            {employee.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="cv-section">
          <h2 className="cv-section-title">Personal Info</h2>
          <div className="cv-grid">
            <div className="cv-field">
              <span className="label">Full Name</span>
              <span className="value">{employee.name}</span>
            </div>
            <div className="cv-field">
              <span className="label">Email</span>
              <span className="value">{employee.email}</span>
            </div>
            <div className="cv-field">
              <span className="label">Phone</span>
              <span className="value">{employee.phone || "Not provided"}</span>
            </div>
          </div>
        </div>

        <div className="cv-section">
          <h2 className="cv-section-title">Work Info</h2>
          <div className="cv-grid">
            <div className="cv-field">
              <span className="label">Department</span>
              <span className="value">{employee.department}</span>
            </div>
            <div className="cv-field">
              <span className="label">Designation</span>
              <span className="value">{employee.designation}</span>
            </div>
            <div className="cv-field">
              <span className="label">Role</span>
              <span className="value">{roleLabels[employee.role]}</span>
            </div>
            <div className="cv-field">
              <span className="label">Joining Date</span>
              <span className="value">{employee.joinDate}</span>
            </div>
            <div className="cv-field">
              <span className="label">Status</span>
              <span className="value">
                {employee.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="cv-section">
          <h2 className="cv-section-title">Projects</h2>
          {assignedProjects.length === 0 ? (
            <p className="cv-empty">Not assigned to any project yet.</p>
          ) : (
            <table className="cv-project-list">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assignedProjects.map((project) => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>{project.status.replace("-", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="cv-footer">
          Generated on{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          — Project Management System
        </div>
      </div>

      <ImagePreviewModal
        src={previewImage}
        alt={employee.name}
        onClose={() => setPreviewImage(null)}
      />
      </div>
    </>
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
