import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  Clock,
  FolderKanban,
  Loader2,
  ChartBar,
  CheckCircle2,
  Hourglass,
  ListChecks,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getMyProjectsSummary } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import {
  getAttendanceRecords,
} from "../../services/attendanceService";
import { getLeaveRequests } from "../../services/leaveService";
import type { MyProjectSummary, ProjectStatus } from "../../types/project";
import type { Task, TaskStatus } from "../../types/task";
import type { AttendanceRecord } from "../../types/attendance";
import type { LeaveRequest } from "../../types/leave";

const projectStatusStyles: Record<ProjectStatus, string> = {
  active: "bg-emerald-50 text-emerald-600",
  on_hold: "bg-amber-50 text-amber-600",
  completed: "bg-slate-100 text-slate-500",
  archived: "bg-slate-100 text-slate-400",
};

const taskStatusStyles: Record<TaskStatus, { badge: string; dot: string }> = {
  not_started: { badge: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
  in_progress: { badge: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  submitted: { badge: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  completed: { badge: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
};

const taskStatusLabels: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  submitted: "Waiting for Review",
  completed: "Approved",
};

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const employeeId = user?.employeeId != null ? String(user.employeeId) : null;

  const [projectSummaries, setProjectSummaries] = useState<MyProjectSummary[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // getTasks() with no filter is auto-scoped server-side to the
      // signed-in employee's own assignments.
      const [summaryData, taskData, attendanceData, leaveData] =
        await Promise.all([
          getMyProjectsSummary(),
          getTasks(),
          getAttendanceRecords(),
          getLeaveRequests(),
        ]);

      if (cancelled) return;

      setProjectSummaries(summaryData);
      setMyTasks(taskData);
      setAttendanceRecords(attendanceData);
      setLeaveRequests(leaveData);
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const myAttendance = useMemo(
    () =>
      employeeId
        ? attendanceRecords.filter((record) => record.employeeId === employeeId)
        : [],
    [attendanceRecords, employeeId],
  );

  const myLeaveRequests = useMemo(
    () =>
      employeeId
        ? [...leaveRequests]
            .filter((leave) => leave.employeeId === employeeId)
            .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))
        : [],
    [leaveRequests, employeeId],
  );

  const recentTasks = useMemo(
    () => [...myTasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [myTasks],
  );

  const activeProjects = projectSummaries.filter(
    (summary) => summary.project.status === "active",
  );
  const completedProjects = projectSummaries.filter(
    (summary) => summary.project.status === "completed",
  );

  const completedTasksCount = myTasks.filter((task) => task.status === "completed").length;

  const presentDays = myAttendance.filter((record) => record.status === "present").length;
  const lateDays = myAttendance.filter((record) => record.status === "late").length;
  const halfDays = myAttendance.filter((record) => record.status === "half-day").length;

  const pendingLeaves = myLeaveRequests.filter((leave) => leave.status === "pending").length;
  const approvedLeaves = myLeaveRequests.filter((leave) => leave.status === "approved").length;

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
          My Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {employeeId
            ? `Welcome back, ${(user?.name ?? "").split(" ")[0]} — here's your project activity.`
            : "Your account isn't linked to an employee profile yet."}
        </p>
      </div>

      {/* Summary Cards */}
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
          title="My Tasks"
          value={String(myTasks.length)}
          subtitle={`${completedTasksCount} completed`}
          icon={<ListChecks size={22} />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />

        <SummaryCard
          title="Present Days"
          value={String(presentDays)}
          subtitle={`${lateDays} late, ${halfDays} half day`}
          icon={<UserCheck size={22} />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />

        <SummaryCard
          title="Leave Requests"
          value={String(pendingLeaves)}
          subtitle={`${approvedLeaves} approved`}
          icon={<CalendarClock size={22} />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* My Projects & Attendance Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* My Projects */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                My Projects
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Projects you're currently assigned to
              </p>
            </div>
            <ChartBar size={21} className="shrink-0 text-slate-400" />
          </div>

          <div className="mt-6 space-y-4">
            {projectSummaries.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                No projects assigned yet
              </div>
            )}
            {projectSummaries.map((summary) => (
              <div key={summary.project.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {summary.project.name}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${projectStatusStyles[summary.project.status]}`}
                    >
                      {summary.project.status}
                    </span>
                  </div>
                  <span className="ml-2 shrink-0 text-sm font-semibold text-slate-900">
                    {summary.myTasks.completed}/{summary.myTasks.total} tasks
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(summary.myProgress, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{summary.project.client ?? "No client"}</span>
                  <span>
                    {summary.myProgress}% my progress · {summary.contributionPercent}% of project
                  </span>
                </div>
              </div>
            ))}
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
                Your logged days
              </p>
            </div>
            <CalendarCheck size={21} className="shrink-0 text-slate-400" />
          </div>

          <div className="mt-6 space-y-3">
            <AttendanceItem label="Present" value={String(presentDays)} color="bg-emerald-500" />
            <AttendanceItem label="Late" value={String(lateDays)} color="bg-orange-500" />
            <AttendanceItem label="Half Day" value={String(halfDays)} color="bg-amber-500" />
            <AttendanceItem label="Pending Leave" value={String(pendingLeaves)} color="bg-blue-500" />
          </div>
        </div>
      </div>

      {/* My Task Log */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">
            My Recent Tasks
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your latest activity across assigned projects
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
                  Task
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Due Date
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Progress
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {recentTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                    No tasks assigned yet.
                  </td>
                </tr>
              )}

              {recentTasks.slice(0, 8).map((task) => {
                const style = taskStatusStyles[task.status];

                return (
                  <tr
                    key={task.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {task.projectName ?? "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                      {task.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {task.dueDate ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {task.progress}%
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        {taskStatusLabels[task.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* My Leave Requests */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              My Leave Requests
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Status of your recent leave applications
            </p>
          </div>
          <Hourglass size={21} className="shrink-0 text-slate-400" />
        </div>

        <div className="mt-4 space-y-2">
          {myLeaveRequests.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">
              No leave requests filed yet
            </div>
          )}

          {myLeaveRequests.slice(0, 5).map((leave) => (
            <div
              key={leave.id}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-1.5 ${
                    leave.status === "approved"
                      ? "bg-emerald-50 text-emerald-600"
                      : leave.status === "rejected"
                        ? "bg-red-50 text-red-600"
                        : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {leave.status === "approved" ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <Clock size={15} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 capitalize">
                    {leave.type} leave
                  </p>
                  <p className="text-xs text-slate-500">
                    {leave.startDate} – {leave.endDate}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                  leave.status === "approved"
                    ? "bg-emerald-50 text-emerald-600"
                    : leave.status === "rejected"
                      ? "bg-red-50 text-red-600"
                      : "bg-amber-50 text-amber-600"
                }`}
              >
                {leave.status}
              </span>
            </div>
          ))}
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

export default EmployeeDashboard;
