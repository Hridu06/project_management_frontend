import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  Clock3,
  FolderKanban,
  Loader2,
  UserCheck,
  Users,
  UserX,
  ChartBar,
  CheckCircle2,
  AlertCircle,
  Clock,
  PlusCircle,
  MoreVertical,
  Calendar,
  TrendingUp,
  Briefcase,
} from "lucide-react";
import { getEmployees } from "../../services/employeeService";
import { getProjects } from "../../services/projectService";
import { getContributions } from "../../services/contributionService";
import {
  getAttendanceRecords,
  formatDuration,
} from "../../services/attendanceService";
import { getLeaveRequests } from "../../services/leaveService";
import type { Employee } from "../../types/employee";
import type { Project } from "../../types/project";
import type { AttendanceRecord, Contribution } from "../../types/attendance";
import type { LeaveRequest } from "../../types/leave";

const Dashboard = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const [employeeData, projectData, attendanceData, contributionData, leaveData] =
        await Promise.all([
          getEmployees(),
          getProjects(),
          getAttendanceRecords(),
          getContributions(),
          getLeaveRequests(),
        ]);

      if (cancelled) return;

      setEmployees(employeeData);
      setProjects(projectData);
      setAttendanceRecords(attendanceData);
      setContributions(contributionData);
      setLeaveRequests(leaveData);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );

  const projectMap = useMemo(
    () => new Map(projects.map((project) => [String(project.id), project])),
    [projects],
  );

  const latestDate = useMemo(() => {
    return attendanceRecords.reduce<string | null>((latest, record) => {
      if (!latest || record.date > latest) return record.date;
      return latest;
    }, null);
  }, [attendanceRecords]);

  const todaysRecords = useMemo(
    () => attendanceRecords.filter((record) => record.date === latestDate),
    [attendanceRecords, latestDate],
  );

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "active"),
    [employees],
  );

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === "active"),
    [projects],
  );

  const completedProjects = useMemo(
    () => projects.filter((project) => project.status === "completed"),
    [projects],
  );

  const onLeaveToday = useMemo(() => {
    if (!latestDate) return 0;

    return leaveRequests.filter(
      (leave) =>
        leave.status === "approved" &&
        leave.startDate <= latestDate &&
        leave.endDate >= latestDate,
    ).length;
  }, [leaveRequests, latestDate]);

  const presentCount = todaysRecords.filter(
    (record) => record.status === "present",
  ).length;

  const halfDayCount = todaysRecords.filter(
    (record) => record.status === "half-day",
  ).length;

  const lateCount = todaysRecords.filter(
    (record) => record.status === "late",
  ).length;

  const absentCount = Math.max(
    activeEmployees.length - todaysRecords.length - onLeaveToday,
    0,
  );

  // Project Statistics
  const projectStats = useMemo(() => {
    return activeProjects.map(project => {
      const projectContributions = contributions.filter(
        c => c.projectId === String(project.id)
      );
      
      const uniqueEmployees = new Set(
        projectContributions.map(c => c.employeeId)
      );

      const totalHours = projectContributions.reduce((total, c) => {
        const [startHour, startMinute] = c.startTime.split(":").map(Number);
        const [endHour, endMinute] = c.endTime.split(":").map(Number);
        const durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
        return total + Math.max(durationMinutes, 0);
      }, 0);

      return {
        ...project,
        totalContributors: uniqueEmployees.size,
        totalHours: Math.round(totalHours / 60),
        totalContributions: projectContributions.length,
      };
    });
  }, [activeProjects, contributions]);

  const totalProjectHours = useMemo(() => {
    return projectStats.reduce((total, p) => total + p.totalHours, 0);
  }, [projectStats]);

  const recentContributions = useMemo(
    () =>
      [...contributions]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    [contributions],
  );

  // Filter contributions by selected project
  const filteredContributions = useMemo(() => {
    if (selectedProject === "all") return recentContributions;
    return recentContributions.filter(c => c.projectId === selectedProject);
  }, [recentContributions, selectedProject]);

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
          Project Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Overview of all projects, team performance, and attendance
        </p>
      </div>

      {/* Summary Cards - Project Focused */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Active Projects"
          value={String(activeProjects.length)}
          subtitle={`${completedProjects.length} completed`}
          icon={<FolderKanban size={22} />}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />

        <SummaryCard
          title="Team Members"
          value={String(activeEmployees.length)}
          subtitle={`${employees.length - activeEmployees.length} inactive`}
          icon={<Users size={22} />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />

        <SummaryCard
          title="Total Hours"
          value={`${totalProjectHours}h`}
          subtitle="Across all projects"
          icon={<Clock3 size={22} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        <SummaryCard
          title="Present Today"
          value={String(presentCount)}
          subtitle={
            activeEmployees.length > 0
              ? `${((presentCount / activeEmployees.length) * 100).toFixed(1)}% attendance`
              : "No active employees"
          }
          icon={<UserCheck size={22} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Project Progress & Attendance Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Project Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Project Progress
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Active projects and their contribution
              </p>
            </div>
            <ChartBar size={21} className="shrink-0 text-slate-400" />
          </div>

          <div className="mt-6 space-y-4">
            {projectStats.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No active projects
              </div>
            )}
            {projectStats.slice(0, 4).map((project) => {
              const progress = Math.min((project.totalContributions / 100) * 100, 100);
              
              return (
                <div key={project.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {project.name}
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                        {project.totalContributors} members
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 shrink-0 ml-2">
                      {project.totalHours}h
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{project.totalContributions} contributions</span>
                    <span>{progress.toFixed(0)}% progress</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Overview */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Attendance
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Today's status
              </p>
            </div>
            <CalendarCheck size={21} className="shrink-0 text-slate-400" />
          </div>

          <div className="mt-6 space-y-3">
            <AttendanceItem
              label="Present"
              value={String(presentCount)}
              color="bg-emerald-500"
            />
            <AttendanceItem
              label="Half Day"
              value={String(halfDayCount)}
              color="bg-amber-500"
            />
            <AttendanceItem
              label="Late"
              value={String(lateCount)}
              color="bg-orange-500"
            />
            <AttendanceItem
              label="Absent"
              value={String(absentCount)}
              color="bg-red-500"
            />
            <AttendanceItem
              label="On Leave"
              value={String(onLeaveToday)}
              color="bg-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickStat
          icon={<UserCheck className="text-emerald-500" size={18} />}
          label="Present"
          value={String(presentCount)}
          color="emerald"
        />
        <QuickStat
          icon={<Clock className="text-orange-500" size={18} />}
          label="Late"
          value={String(lateCount)}
          color="orange"
        />
        <QuickStat
          icon={<AlertCircle className="text-red-500" size={18} />}
          label="Absent"
          value={String(absentCount)}
          color="red"
        />
        <QuickStat
          icon={<Calendar className="text-blue-500" size={18} />}
          label="On Leave"
          value={String(onLeaveToday)}
          color="blue"
        />
      </div>

      {/* Recent Activity with Project Filter */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recent Contributions
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest project activities
              </p>
            </div>
            
            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Employee
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Project
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Task
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
              {filteredContributions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-slate-400"
                  >
                    No recent contributions found.
                  </td>
                </tr>
              )}

              {filteredContributions.map((contribution) => {
                const employee = employeeMap.get(contribution.employeeId);
                const project = projectMap.get(contribution.projectId);
                const [startHour, startMinute] = contribution.startTime
                  .split(":")
                  .map(Number);
                const [endHour, endMinute] = contribution.endTime
                  .split(":")
                  .map(Number);
                const durationMinutes =
                  endHour * 60 + endMinute - (startHour * 60 + startMinute);

                return (
                  <ActivityRow
                    key={contribution.id}
                    employee={employee?.name || "Unknown"}
                    initial={(employee?.name || "?").charAt(0).toUpperCase()}
                    project={project?.name || "Unknown"}
                    task={contribution.task}
                    duration={formatDuration(Math.max(durationMinutes, 0))}
                  />
                );
              })}
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

interface AttendanceItemProps {
  label: string;
  value: string;
  color: string;
}

interface QuickStatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

interface ActivityRowProps {
  employee: string;
  initial: string;
  project: string;
  task: string;
  duration: string;
}

// Component Definitions
const SummaryCard = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
}: SummaryCardProps) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className={`shrink-0 rounded-lg p-2.5 ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const AttendanceItem = ({ label, value, color }: AttendanceItemProps) => {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
};

const QuickStat = ({ icon, label, value, color }: QuickStatProps) => {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    red: "bg-red-50 text-red-600",
    blue: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className={`rounded-lg p-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-base font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const ActivityRow = ({
  employee,
  initial,
  project,
  task,
  duration,
}: ActivityRowProps) => {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
            {initial}
          </div>
          <span className="text-sm font-medium text-slate-800">{employee}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600">{project}</td>
      <td className="px-6 py-4 text-sm text-slate-600">{task}</td>
      <td className="px-6 py-4 text-sm font-medium text-slate-700">{duration}</td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      </td>
    </tr>
  );
};

export default Dashboard;