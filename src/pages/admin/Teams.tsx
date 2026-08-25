import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Eye, Pencil, Plus, Search, Trash2, Users2 } from "lucide-react";
import Modal from "../../components/common/Modal";
import {
  createTeam,
  deleteTeam,
  getAssignableUsers,
  getTeamList,
  updateTeam,
} from "../../services/teamService";
import { useAuth } from "../../context/AuthContext";
import type {
  Team,
  TeamAssignableUser,
  TeamFormInput,
  TeamMemberRole,
} from "../../types/team";

const emptyForm: TeamFormInput = {
  name: "",
  description: "",
  managerId: null,
  members: [],
};

const roleLabels: Record<TeamMemberRole, string> = {
  team_leader: "Team Leader",
  manager: "Manager",
  employee: "Employee",
};

// The team's manager is set via the dedicated Manager field above — members
// are only ever Team Leads or Employees.
const memberRoleOptions: TeamMemberRole[] = ["team_leader", "employee"];

const Teams = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  // Managers can create and edit teams alongside admins; deleting stays
  // admin-only.
  const canManageTeams = isAdmin || isManager;

  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<TeamAssignableUser[]>([]);
  const [managers, setManagers] = useState<TeamAssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TeamFormInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);

  useEffect(() => {
    const load = async () => {
      // Employees only get the read-only team list — /teams/assignable-users
      // is admin/manager-only, so skip it entirely rather than eating an
      // avoidable 403.
      if (!canManageTeams) {
        setTeams(await getTeamList());
        setLoading(false);
        return;
      }

      const [teamList, assignableUsers] = await Promise.all([
        getTeamList(),
        getAssignableUsers(),
      ]);

      setTeams(teamList);
      setUsers(assignableUsers);
      setManagers(assignableUsers.filter((item) => item.role === "manager"));
      setLoading(false);
    };

    load();
  }, [canManageTeams]);

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return teams;

    return teams.filter((team) => team.name.toLowerCase().includes(term));
  }, [teams, search]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openViewModal = (team: Team) => {
    setViewingTeam(team);
    setViewModalOpen(true);
  };

  const openEditModal = (team: Team) => {
    setEditingId(team.id);
    setForm({
      name: team.name,
      description: team.description ?? "",
      managerId: team.managerId,
      members: team.members.map(({ id, role }) => ({ user_id: id, role })),
    });
    setError(null);
    setModalOpen(true);
  };

  const toggleMember = (userId: number, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      members: checked
        ? [...prev.members, { user_id: userId, role: "employee" }]
        : prev.members.filter((member) => member.user_id !== userId),
    }));
  };

  const setMemberRole = (userId: number, role: TeamMemberRole) => {
    setForm((prev) => ({
      ...prev,
      members: prev.members.map((member) =>
        member.user_id === userId ? { ...member, role } : member,
      ),
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const updated = await updateTeam(editingId, form);
        setTeams((prev) =>
          prev.map((team) => (team.id === editingId ? updated : team)),
        );
      } else {
        const created = await createTeam(form);
        setTeams((prev) => [created, ...prev]);
      }

      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save team");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: Team) => {
    const confirmed = window.confirm(
      team.member_count > 0
        ? `${team.name} has ${team.member_count} member(s). Delete anyway?`
        : `Delete ${team.name}? This cannot be undone.`,
    );

    if (!confirmed) return;

    await deleteTeam(team.id);
    setTeams((prev) => prev.filter((item) => item.id !== team.id));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teams</h1>
          <p className="mt-1 text-sm text-slate-500">
            {canManageTeams
              ? "Create teams and assign managers and members."
              : "Teams you're part of and their members."}
          </p>
        </div>

        {canManageTeams && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Team
          </button>
        )}
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
          placeholder="Search by team name"
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
                  Team
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Manager
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Members
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Team Size
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
                    Loading teams...
                  </td>
                </tr>
              )}

              {!loading && filteredTeams.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Users2 size={22} className="text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">
                        No teams found
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredTeams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                          {team.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {team.name}
                          </p>
                          {team.description && (
                            <p className="max-w-xs truncate text-xs text-slate-500">
                              {team.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {team.managerName ?? (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {team.members.length === 0
                        ? "—"
                        : team.members.map((member) => member.name).join(", ")}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {team.member_count} member
                      {team.member_count === 1 ? "" : "s"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openViewModal(team)}
                          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                          aria-label={`View ${team.name}`}
                        >
                          <Eye size={16} />
                        </button>

                        {canManageTeams && (
                          <button
                            type="button"
                            onClick={() => openEditModal(team)}
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600"
                            aria-label={`Edit ${team.name}`}
                          >
                            <Pencil size={16} />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(team)}
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                            aria-label={`Delete ${team.name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
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
        title={editingId ? "Edit Team" : "Add Team"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Team Name <span className="text-red-500">*</span>
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
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="What does this team work on?"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Manager
            </label>
            <select
              value={form.managerId ?? ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  managerId: event.target.value
                    ? Number(event.target.value)
                    : null,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Unassigned</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Members
            </label>

            <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {users.length === 0 && (
                <p className="px-2 py-3 text-sm text-slate-400">
                  No users available
                </p>
              )}

              {users.map((user) => {
                const member = form.members.find(
                  (item) => item.user_id === user.id,
                );

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                  >
                    <label className="flex min-w-0 flex-1 items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={Boolean(member)}
                        onChange={(event) =>
                          toggleMember(user.id, event.target.checked)
                        }
                        className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate text-sm text-slate-700">
                        {user.name}
                      </span>
                    </label>

                    {member && (
                      <select
                        value={member.role}
                        onChange={(event) =>
                          setMemberRole(
                            user.id,
                            event.target.value as TeamMemberRole,
                          )
                        }
                        className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        {memberRoleOptions.map((value) => (
                          <option key={value} value={value}>
                            {roleLabels[value]}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
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
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Team"}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Team Details"
      >
        {viewingTeam && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-base font-semibold text-blue-600">
                {viewingTeam.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {viewingTeam.name}
                </p>
                <p className="text-xs text-slate-500">
                  {viewingTeam.member_count} member
                  {viewingTeam.member_count === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {viewingTeam.description && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="text-sm text-slate-700">
                  {viewingTeam.description}
                </p>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Manager
              </p>
              <p className="text-sm text-slate-700">
                {viewingTeam.managerName ?? (
                  <span className="text-slate-400">Unassigned</span>
                )}
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Members
              </p>

              {viewingTeam.members.length === 0 ? (
                <p className="text-sm text-slate-400">No members yet</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {viewingTeam.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-700">
                          {member.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {member.email}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {roleLabels[member.role]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Teams;
