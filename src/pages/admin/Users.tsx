import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";
import Modal from "../../components/common/Modal";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../../services/userService";
import { getEmployees } from "../../services/employeeService";
import type { User, UserFormInput, UserRole } from "../../types/user";
import type { Employee } from "../../types/employee";

const emptyForm: UserFormInput = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  employeeId: null,
};

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

const roleTabs: Array<{ value: "all" | UserRole; label: string }> = [
  { value: "all", label: "All" },
  { value: "employee", label: "Employees" },
  { value: "manager", label: "Managers" },
  { value: "admin", label: "Admins" },
];

const Users = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const roleFilter = (searchParams.get("role") as UserRole | null) ?? "all";

  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    const [userList, employeeList] = await Promise.all([
      getUsers(),
      getEmployees(),
    ]);

    setUsers(userList);
    setEmployees(employeeList);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Employees that don't already have a user account — plus whichever
  // employee this form is currently pointing at (so editing still shows it).
  const availableEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          Number(employee.id) === form.employeeId ||
          !users.some(
            (user) =>
              user.employeeId === Number(employee.id) && user.id !== editingId,
          ),
      ),
    [employees, users, form.employeeId, editingId],
  );

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!term) return true;

      return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    });
  }, [users, search, roleFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      role: roleFilter === "all" ? "employee" : roleFilter,
    });
    setError(null);
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      employeeId: user.employeeId,
    });
    setError(null);
    setShowPassword(false);
    setModalOpen(true);
  };

  const selectEmployee = (employeeId: number | null) => {
    const employee = employees.find((item) => Number(item.id) === employeeId);

    setForm((prev) => ({
      ...prev,
      employeeId,
      name: employee ? employee.name : prev.name,
      email: employee ? employee.email : prev.email,
      // Employees added through the Manager module are flagged manager-track,
      // so pre-select their role instead of leaving it on the default.
      role: employee?.isManager ? "manager" : prev.role,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const updated = await updateUser(editingId, form);
        setUsers((prev) =>
          prev.map((user) => (user.id === editingId ? updated : user)),
        );
      } else {
        const created = await createUser(form);
        setUsers((prev) => [created, ...prev]);
      }

      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = window.confirm(
      `Delete ${user.name}'s login account? This cannot be undone.`,
    );

    if (!confirmed) return;

    await deleteUser(user.id);
    setUsers((prev) => prev.filter((item) => item.id !== user.id));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            Grant an employee login access and assign their role.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      {/* Role Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-1.5">
        {roleTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() =>
              setSearchParams(tab.value === "all" ? {} : { role: tab.value })
            }
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              roleFilter === tab.value
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
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
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  User
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Linked Employee
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                    Loading users...
                  </td>
                </tr>
              )}

              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <UsersRound size={22} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No users found
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                          {user.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {user.name}
                          </p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {roleLabels[user.role]}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.employeeName ?? (
                        <span className="text-slate-400">Not linked</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.lastLoginAt ?? (
                        <span className="text-slate-400">Never</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          aria-label={`Edit ${user.name}`}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                          aria-label={`Delete ${user.name}`}
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
        title={editingId ? "Edit User" : "Add User"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.employeeId ?? ""}
              onChange={(event) =>
                selectEmployee(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>
                Select an employee
              </option>
              {availableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                  {employee.isManager ? " (Manager)" : ""}
                </option>
              ))}
            </select>
            {availableEmployees.length === 0 && (
              <p className="mt-1.5 text-xs text-slate-400">
                Every employee already has a user account. Add a new employee
                first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Login Email <span className="text-red-500">*</span>
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
                Role
              </label>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    role: event.target.value as UserRole,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Password{" "}
              {!editingId && <span className="text-red-500">*</span>}{" "}
              {editingId && (
                <span className="font-normal text-slate-400">
                  (leave blank to keep current)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                required={!editingId}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

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
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add User"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
