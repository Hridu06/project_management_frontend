import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  FolderKanban,
  KeyRound,
  ListChecks,
  Loader2,
  Mail,
  Pencil,
  Phone,
  PlaneTakeoff,
  Printer,
  ShieldCheck,
  UserCircle,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ChangePasswordModal from "../../components/common/ChangePasswordModal";
import ImagePreviewModal from "../../components/common/ImagePreviewModal";
import { getMyProfile, updateMyProfile } from "../../services/employeeService";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getLeaveRequests } from "../../services/leaveService";
import type { Employee } from "../../types/employee";
import type { Project } from "../../types/project";
import type { UserRole } from "../../types/user";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

// CV-style print styles for the printable profile view — mirrors the
// admin-facing employee profile print view (pages/employees/profile.tsx)
// so an employee's own printed profile looks the same.
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

const EmployeeMyProfile = () => {
  const { user, refreshUser } = useAuth();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [taskSummary, setTaskSummary] = useState({ total: 0, completed: 0 });
  const [approvedLeaveDays, setApprovedLeaveDays] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // getTasks() with no filter is auto-scoped server-side to the
      // signed-in employee's own assignments, so this always reflects the
      // latest status (e.g. right after a task is submitted/approved).
      const [profile, projects, myTasks, leaveRequests] = await Promise.all([
        getMyProfile(),
        getProjects(),
        getTasks(),
        getLeaveRequests(),
      ]);

      setEmployee(profile);
      setTaskSummary({
        total: myTasks.length,
        completed: myTasks.filter((task) => task.status === "completed").length,
      });

      if (profile) {
        setForm({ name: profile.name, email: profile.email, phone: profile.phone });

        setAssignedProjects(
          projects.filter((project) =>
            project.members.some((member) => member.email === profile.email),
          ),
        );

        // getLeaveRequests() is already scoped server-side to the
        // signed-in employee's own requests.
        setApprovedLeaveDays(
          leaveRequests
            .filter((leave) => leave.status === "approved")
            .reduce((sum, leave) => sum + leave.days, 0),
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
      await refreshUser();
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

  const handlePrint = () => {
    if (!employee) return;

    const originalTitle = document.title;
    const fileName = `${employee.name.trim().replace(/\s+/g, "_")}_Profile`;

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
    <>
      {/* Print Styles */}
      <style>{printStyles}</style>

      <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            View your details and keep your contact info up to date
          </p>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {/* Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 print:hidden">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {editing ? (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="group relative block h-14 w-14 rounded-full"
                  aria-label="Change photo"
                >
                  {avatarPreview || employee.avatar ? (
                    <img
                      src={avatarPreview ?? employee.avatar ?? undefined}
                      alt={employee.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-600">
                      {initials}
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900/0 text-white opacity-0 transition-all group-hover:bg-slate-900/40 group-hover:opacity-100">
                    <Camera size={16} />
                  </span>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white ring-2 ring-white">
                    <Camera size={11} />
                  </span>
                </button>
              ) : avatarPreview || employee.avatar ? (
                <button
                  type="button"
                  onClick={() => setZoomImage(avatarPreview ?? employee.avatar)}
                  className="block h-14 w-14 rounded-full"
                >
                  <img
                    src={avatarPreview ?? employee.avatar ?? undefined}
                    alt={employee.name}
                    className="h-14 w-14 cursor-pointer rounded-full object-cover transition-opacity hover:opacity-90"
                  />
                </button>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-lg font-semibold text-blue-600">
                  {initials}
                </div>
              )}

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
              />
            </div>

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
            value={String(assignedProjects.length)}
            bg="bg-violet-50"
          />
          <StatCard
            icon={<ListChecks size={18} className="text-blue-500" />}
            label="Total Tasks"
            value={String(taskSummary.total)}
            bg="bg-blue-50"
          />
          <StatCard
            icon={<CheckCircle2 size={18} className="text-emerald-500" />}
            label="Completed Tasks"
            value={String(taskSummary.completed)}
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

              <p className="text-xs text-slate-400">
                Tip: click your photo above to change it.
              </p>

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

      {/* Print-only CV */}
      <div className="hidden print:block cv-page">
        <div className="cv-header">
          {employee.avatar ? (
            <img src={employee.avatar} alt={employee.name} className="cv-avatar" />
          ) : (
            <div className="cv-avatar-fallback">{initials}</div>
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
              <span className="value">{employee.joinDate || "—"}</span>
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

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

      <ImagePreviewModal
        src={zoomImage}
        alt={employee.name}
        onClose={() => setZoomImage(null)}
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

export default EmployeeMyProfile;
