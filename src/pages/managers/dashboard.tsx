import { useEffect, useMemo, useState } from "react";
import {
  ChartBar,
  FolderKanban,
  Loader2,
  TrendingUp,
  UserCheck,
  Users2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getTeamList } from "../../services/teamService";
import { getProjects } from "../../services/projectService";
import type { Team, TeamMember } from "../../types/team";
import type { Project, ProjectStatus } from "../../types/project";

const projectStatusStyles: Record<ProjectStatus, string> = {
  active: "bg-emerald-50 text-emerald-600",
  on_hold: "bg-amber-50 text-amber-600",
  completed: "bg-slate-100 text-slate-500",
  archived: "bg-slate-100 text-slate-400",
};

const roleLabels: Record<TeamMember["role"], string> = {
  team_leader: "Team Leader",
  manager: "Manager",
  employee: "Employee",
};

const ManagerDashboard = () => {
  const { user } = useAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [teamData, projectData] = await Promise.all([
        getTeamList(),
        getProjects(),
      ]);

      if (cancelled) return;

      setTeams(teamData);
      setProjects(projectData);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // A manager's scope is the teams they're assigned to lead, and whatever
  // projects are linked to those teams — there's no direct manager-to-project
  // link on the backend yet.
  const myTeams = useMemo(
    () => teams.filter((team) => team.managerId === user?.id),
    [teams, user?.id],
  );

  const myTeamIds = useMemo(
    () => new Set(myTeams.map((team) => team.id)),
    [myTeams],
  );

  const myProjects = useMemo(
    () =>
      projects.filter(
        (project) => project.teamId != null && myTeamIds.has(project.teamId),
      ),
    [projects, myTeamIds],
  );

  const uniqueMembers = useMemo(() => {
    const map = new Map<number, TeamMember & { teamName: string }>();

    for (const team of myTeams) {
      for (const member of team.members) {
        if (!map.has(member.id)) {
          map.set(member.id, { ...member, teamName: team.name });
        }
      }
    }

    return [...map.values()];
  }, [myTeams]);

  const activeProjects = myProjects.filter((project) => project.status === "active");
  const completedProjects = myProjects.filter((project) => project.status === "completed");

  const averageProgress = myProjects.length
    ? Math.round(
        myProjects.reduce((total, project) => total + project.progress, 0) /
          myProjects.length,
      )
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Manager Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, {(user?.name ?? "").split(" ")[0]} — here's an overview
          of the teams you manage.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Teams Managed"
          value={String(myTeams.length)}
          subtitle={`${uniqueMembers.length} team member${uniqueMembers.length === 1 ? "" : "s"}`}
          icon={<Users2 size={22} />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />

        <SummaryCard
          title="Active Projects"
          value={String(activeProjects.length)}
          subtitle={`${completedProjects.length} completed`}
          icon={<FolderKanban size={22} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        <SummaryCard
          title="Team Members"
          value={String(uniqueMembers.length)}
          subtitle="Across all your teams"
          icon={<UserCheck size={22} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <SummaryCard
          title="Avg. Progress"
          value={`${averageProgress}%`}
          subtitle="Across your projects"
          icon={<TrendingUp size={22} />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* Teams & Members Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* My Teams */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                My Teams
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Teams you're assigned to manage
              </p>
            </div>
            <ChartBar size={21} className="shrink-0 text-slate-400" />
          </div>

          <div className="mt-6 space-y-4">
            {myTeams.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No teams assigned to you yet
              </div>
            )}

            {myTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {team.name}
                    </p>
                    {team.description && (
                      <p className="truncate text-xs text-slate-500">
                        {team.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                  {team.member_count} member{team.member_count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Members */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Team Members
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                People across your teams
              </p>
            </div>
            <UserCheck size={21} className="shrink-0 text-slate-400" />
          </div>

          <div className="mt-6 max-h-80 space-y-2 overflow-y-auto">
            {uniqueMembers.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">
                No members yet
              </div>
            )}

            {uniqueMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {member.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {member.teamName}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                  {roleLabels[member.role]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Overview */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">
            Projects Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Projects linked to the teams you manage
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Project
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Team
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Progress
                </th>
              </tr>
            </thead>

            <tbody>
              {myProjects.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">
                    No projects linked to your teams yet.
                  </td>
                </tr>
              )}

              {myProjects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">
                    {project.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {project.teamName ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${projectStatusStyles[project.status]}`}
                    >
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${Math.min(project.progress, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {project.progress}%
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

// Component Interfaces
interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

// Component Definitions
const SummaryCard = ({ title, value, subtitle, icon, iconBg, iconColor }: SummaryCardProps) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`shrink-0 rounded-lg p-2.5 ${iconBg} ${iconColor}`}>{icon}</div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
