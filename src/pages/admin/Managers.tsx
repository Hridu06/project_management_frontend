import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import Modal from "../../components/common/Modal";
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from "../../services/employeeService";
import { deleteUser, getUsers } from "../../services/userService";
import { getDepartmentList } from "../../services/departmentService";
import { getDesignationList } from "../../services/designationService";
import type { Employee, EmployeeFormInput, EmployeeStatus } from "../../types/employee";
import type { Department } from "../../types/department";
import type { Designation } from "../../types/designation";

interface ManagerRow {
  key: string;
  employeeId: string | null;
  userId: number | null;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  department: string;
  designation: string;
  status: EmployeeStatus | null;
  hasLogin: boolean;
}

const emptyForm: EmployeeFormInput = {
  name: "",
  email: "",
  phone: "",
  departmentId: null,
  designationId: null,
  role: "manager",
  joinDate: new Date().toISOString().slice(0, 10),
  status: "active",
  avatarFile: null,
  isManager: true,
};

const Managers = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [managerRows, setManagerRows] = useState<ManagerRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildRows = (employeeList: Employee[], managerUsers: Awaited<ReturnType<typeof getUsers>>): ManagerRow[] => {
    const managerUserByEmployeeId = new Map(
      managerUsers.filter((user) => user.employeeId !== null).map((user) => [user.employeeId as number, user]),
    );

    const rows: ManagerRow[] = [];

    // Anyone whose role is already "manager", plus employees flagged as
    // manager-track (created via this module, may not have a login yet).
    for (const employee of employeeList) {
      const linkedManagerUser = managerUserByEmployeeId.get(Number(employee.id));
      if (!employee.isManager && !linkedManagerUser) continue;

      rows.push({
        key: `emp-${employee.id}`,
        employeeId: employee.id,
        userId: linkedManagerUser?.id ?? null,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        avatar: employee.avatar,
        department: employee.department,
        designation: employee.designation,
        status: employee.status,
        hasLogin: employee.hasUserAccount,
      });
    }

    // Manager-role users that were created without ever linking an employee
    // profile (edge case) — still belongs in this list.
    for (const user of managerUsers) {
      if (user.employeeId !== null) continue;

      rows.push({
        key: `user-${user.id}`,
        employeeId: null,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: "",
        avatar: null,
        department: "",
        designation: "",
        status: null,
        hasLogin: true,
      });
    }

    return rows;
  };

  const load = async () => {
    setLoading(true);
    const [employeeList, managerUsers, departmentList, designationList] = await Promise.all([
      getEmployees(),
      getUsers({ role: "manager" }),
      getDepartmentList(),
      getDesignationList(),
    ]);

    setEmployees(employeeList);
    setManagerRows(buildRows(employeeList, managerUsers));
    setDepartments(departmentList);
    setDesignations(designationList);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredManagers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return managerRows;

    return managerRows.filter(
      (manager) =>
        manager.name.toLowerCase().includes(term) ||
        manager.email.toLowerCase().includes(term),
    );
  }, [managerRows, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (manager: ManagerRow) => {
    const employee = employees.find((item) => item.id === manager.employeeId);
    if (!employee) return;

    setEditingId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      role: "manager",
      joinDate: employee.joinDate,
      status: employee.status,
      avatarFile: null,
      isManager: true,
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const savedEmployee = editingId
        ? await updateEmployee(editingId, form)
        : await createEmployee(form);

      const nextEmployees = editingId
        ? employees.map((employee) => (employee.id === editingId ? savedEmployee : employee))
        : [savedEmployee, ...employees];

      const managerUsers = await getUsers({ role: "manager" });

      setEmployees(nextEmployees);
      setManagerRows(buildRows(nextEmployees, managerUsers));
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save manager");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (manager: ManagerRow) => {
    const confirmed = window.confirm(
      `Delete ${manager.name}? This cannot be undone.`,
    );

    if (!confirmed) return;

    // A linked login has to go first — the employee row is protected by a
    // restrict-on-delete foreign key while a user still points at it.
    if (manager.userId !== null) {
      await deleteUser(manager.userId);
    }
    if (manager.employeeId !== null) {
      await deleteEmployee(manager.employeeId);
    }

    setManagerRows((prev) => prev.filter((item) => item.key !== manager.key));
    if (manager.employeeId !== null) {
      const employeeId = manager.employeeId;
      setEmployees((prev) => prev.filter((item) => item.id !== employeeId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manager</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a manager profile here — grant them login access from the
            Users module afterwards.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Manager
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manager
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Department
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Designation
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Login
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
                    Loading managers...
                  </td>
                </tr>
              )}

              {!loading && filteredManagers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <ShieldCheck size={22} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No managers found
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredManagers.map((manager) => (
                  <tr key={manager.key} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {manager.avatar ? (
                          <img
                            src={manager.avatar}
                            alt={manager.name}
                            className="h-9 w-9 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                            {manager.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {manager.name}
                          </p>
                          <p className="text-xs text-slate-500">{manager.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {manager.department || <span className="text-slate-400">—</span>}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {manager.designation || <span className="text-slate-400">—</span>}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          manager.hasLogin
                            ? "bg-blue-50 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {manager.hasLogin ? "Active login" : "No login yet"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {manager.status ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            manager.status === "active"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {manager.status === "active" ? "Active" : "Inactive"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(manager)}
                          disabled={manager.employeeId === null}
                          title={
                            manager.employeeId === null
                              ? "No employee profile — manage this login from Users"
                              : undefined
                          }
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label={`Edit ${manager.name}`}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(manager)}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                          aria-label={`Delete ${manager.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit Manager" : "Add Manager"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Full Name <span className="text-red-500">*</span>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email <span className="text-red-500">*</span>
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
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Avatar
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  avatarFile: event.target.files?.[0] ?? null,
                }))
              }
              className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.departmentId ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    departmentId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="" disabled>
                  Select department
                </option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Designation <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.designationId ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    designationId: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="" disabled>
                  Select designation
                </option>
                {designations.map((designation) => (
                  <option key={designation.id} value={designation.id}>
                    {designation.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Role
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <ShieldCheck size={16} className="text-blue-500" />
                Manager
                <span className="ml-auto text-xs text-slate-400">Automatic</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as EmployeeStatus,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Join Date <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="date"
              value={form.joinDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, joinDate: event.target.value }))
              }
              className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <p className="text-xs text-slate-400">
            No login here — once saved, go to Users and select this person to
            grant them a manager login.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Manager"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Managers;
