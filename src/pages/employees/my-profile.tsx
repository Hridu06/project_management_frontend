import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  Clock3,
  FolderKanban,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Phone,
  PlaneTakeoff,
  ShieldCheck,
  UserCheck,
  UserCircle,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ChangePasswordModal from "../../components/common/ChangePasswordModal";
import { getMyProfile, updateMyProfile } from "../../services/employeeService";
import { getProjects } from "../../services/projectService";
import { getAttendanceRecords, formatDuration } from "../../services/attendanceService";
import { getLeaveRequests, countLeaveDays } from "../../services/leaveService";
import type { Employee } from "../../types/employee";
import type { UserRole } from "../../types/user";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

const EmployeeMyProfile = () => {
  const { user } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignedProjectCount, setAssignedProjectCount] = useState(0);
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalMinutes: 0,
    present: 0,
    late: 0,
  });
  const [approvedLeaveDays, setApprovedLeaveDays] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [profile, projects, attendanceRecords, leaveRequests] = await Promise.all([
        getMyProfile(),
        getProjects(),
        getAttendanceRecords(),
        getLeaveRequests(),
      ]);

      setEmployee(profile);

      if (profile) {
        setForm({ name: profile.name, email: profile.email, phone: profile.phone });

        const employeeId = profile.id;
        setAssignedProjectCount(
          projects.filter((project) =>
            project.members.some((member) => member.email === profile.email),
          ).length,
        );

        const myAttendance = attendanceRecords.filter(
          (record) => record.employeeId === employeeId,
        );
        setAttendanceSummary({
          totalMinutes: myAttendance.reduce((sum, record) => sum + record.totalMinutes, 0),
          present: myAttendance.filter((record) => record.status === "present").length,
          late: myAttendance.filter((record) => record.status === "late").length,
        });

        const myLeaves = leaveRequests.filter((leave) => leave.employeeId === employeeId);
        setApprovedLeaveDays(
          myLeaves
            .filter((leave) => leave.status === "approved")
            .reduce((sum, leave) => sum + countLeaveDays(leave.startDate, leave.endDate), 0),
        );
      }

      setLoading(false);
    };

    load();
  }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const startEdit = () => {
    if (!employee) return;
    setForm({ name: employee.name, email: employee.email, phone: employee.phone });
    setAvatarFile(null);
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (!employee) return;
    setForm({ name: employee.name, email: employee.email, phone: employee.phone });
    setAvatarFile(null);
    setError(null);
    setEditing(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updated = await updateMyProfile({ ...form, avatarFile });
      setEmployee(updated);
      setAvatarFile(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = useMemo(
    () => (employee?.name || user?.name || "?").charAt(0).toUpperCase(),
    [employee, user],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Profile</h1>
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
          Your account isn't linked to an employee profile yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          View your details and keep your contact info up to date
        </p>
      </div>

      {/* Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            {avatarPreview || employee.avatar ? (
              <img
                src={avatarPreview ?? employee.avatar ?? undefined}
                alt={employee.name}
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-600">
                {initials}
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold text-slate-900">{employee.name}</h2>
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
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon={<FolderKanban size={18} className="text-violet-500" />}
            label="Projects"
            value={String(assignedProjectCount)}
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
            icon={<PlaneTakeoff size={18} className="text-amber-500" />}
            label="Leave Days"
            value={String(approvedLeaveDays)}
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
                <p className="text-sm text-slate-500">Your editable contact details.</p>
              </div>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={startEdit}
                className="flex items-center gap-1.5 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                aria-label="Edit personal info"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>

          {editing ? (
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
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
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
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
                  value={form.phone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Avatar
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

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
                  onClick={cancelEdit}
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
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Work Info</h2>
              <p className="text-sm text-slate-500">
                Managed by your admin — read-only here.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Building2 size={12} />
                Department
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{employee.department || "—"}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Briefcase size={12} />
                Designation
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{employee.designation || "—"}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <UserCircle size={12} />
                Role
              </dt>
              <dd className="mt-1 text-sm text-slate-700">
                {roleLabels[employee.role]}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Calendar size={12} />
                Join Date
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{employee.joinDate || "—"}</dd>
            </div>
          </dl>
        </div>

        {/* Security */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Security</h2>
              <p className="text-sm text-slate-500">Keep your account secure.</p>
            </div>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <KeyRound size={16} />
              Change Password
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
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

export default EmployeeMyProfile;
