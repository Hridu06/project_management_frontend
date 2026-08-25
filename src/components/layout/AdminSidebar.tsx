import { Fragment, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserCheck,
  Users2,
  FolderKanban,
  Clock3,
  CalendarDays,
  Calendar,
  BarChart3,
  Settings,
  ListChecks,
  UserCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ClipboardList,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth, type Role } from "../../context/AuthContext";
import { getProjects } from "../../services/projectService";
import type { Project } from "../../types/project";
import logo from "../../assets/Nanosoft.png";

type ProjectTabId = "tasks" | "calendar" | "analytics" | "settings";

const PROJECT_TABS: { id: ProjectTabId; label: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings, adminOnly: true },
];

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  sub?: NavItem[];
  // Omit to show to every signed-in role; otherwise restrict to these.
  roles?: Role[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        to: "/app/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["admin"],
      },
      {
        to: "/app/my-dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["employee"],
      },
      {
        to: "/app/manager-dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["manager"],
      },
      {
        to: "/app/tasks",
        label: "My Tasks",
        icon: ListChecks,
        roles: ["employee"],
      },
      {
        to: "/app/my-contributions",
        label: "Contributions",
        icon: FolderKanban,
        roles: ["employee"],
      },
      {
        to: "/app/my-profile",
        label: "My Profile",
        icon: UserCircle,
        roles: ["employee", "manager"],
      },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/app/employees", label: "Employees", icon: Users, roles: ["admin"] },
      // { to: "/app/managers", label: "Manager", icon: UserCheck, roles: ["admin"] },
      // { to: "/app/users", label: "Users", icon: UserCog, roles: ["admin"] },
      { to: "/app/teams", label: "Teams", icon: Users2 },
      {
        to: "/app/projects",
        label: "Projects",
        icon: FolderKanban,
        roles: ["admin", "manager"],
      },
      {
        to: "/app/projects/tasks",
        label: "Tasks",
        icon: ClipboardList,
        roles: ["admin", "manager"],
      },
      {
        to: "/app/projects/contributions",
        label: "Contributions",
        icon: ListChecks,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/app/attendance", label: "Attendance", icon: Clock3, roles: ["admin"] },
      { to: "/app/leave", label: "Leave", icon: CalendarDays, roles: ["admin"] },
      { to: "/app/reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/app/settings", label: "Settings", icon: Settings, roles: ["admin"] },
    ],
  },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const AdminSidebar = ({ open, onClose }: AdminSidebarProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const canManageProjects = user?.role === "admin" || user?.role === "manager";

  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      // Employees don't get the sidebar's Projects section, so skip the fetch.
      if (user.role === "employee") {
        setProjects([]);
        return;
      }

      try {
        const list = await getProjects();
        if (!cancelled) setProjects(list);
      } catch {
        if (!cancelled) setProjects([]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-expand the project whose detail page is currently open.
  useEffect(() => {
    const match = location.pathname.match(/^\/app\/projects\/(\d+)/);
    if (match) setExpandedProjectId(Number(match[1]));
  }, [location.pathname]);

  const toggleProject = (id: number) => {
    setExpandedProjectId((prev) => (prev === id ? null : id));
  };

  const projectsListPath = user?.role === "employee" ? "/app/my-projects" : "/app/projects";
  const visibleProjectTabs = PROJECT_TABS.filter((tab) => !tab.adminOnly || canManageProjects);
  const activeProjectTab = new URLSearchParams(location.search).get("tab") ?? "tasks";

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => !item.roles || (user && item.roles.includes(user.role)))
        .map((item) => ({
          ...item,
          sub: item.sub?.filter(
            (subItem) =>
              !subItem.roles || (user && subItem.roles.includes(user.role)),
          ),
        })),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden print:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-[2px_0_12px_-4px_rgba(15,23,42,0.06)] transition-transform duration-200 ease-in-out md:z-40 md:translate-x-0 print:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <a
            href="https://www.nanoit.biz/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={logo}
              alt="Nanosoft"
              className="h-16 w-auto object-contain"
            />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {visibleGroups.map((group) => (
            <Fragment key={group.label}>
              <div>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>

                <div className="space-y-0.5">
                  {group.items.map(({ to, label, icon: Icon, sub }) => (
                    <div key={to}>
                      <NavLink
                        to={to}
                        end
                        onClick={onClose}
                        className={({ isActive }) =>
                          `group flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`
                        }
                      >
                        <Icon size={17} className="shrink-0" />
                        <span>{label}</span>
                      </NavLink>

                      {sub && (
                        <div className="mt-0.5 space-y-0.5">
                          {sub.map((subItem) => (
                            <NavLink
                              key={subItem.to}
                              to={subItem.to}
                              onClick={onClose}
                              className={({ isActive }) =>
                                `flex items-center gap-2.5 rounded-lg border-l-2 py-1.5 pl-9 pr-3 text-[13px] font-medium transition-colors ${
                                  isActive
                                    ? "border-blue-600 bg-blue-50 text-blue-700"
                                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                }`
                              }
                            >
                              <subItem.icon size={15} className="shrink-0" />
                              <span>{subItem.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {group.label === "Management" && canManageProjects && (
                // Projects — dynamic list of created projects with per-project
                // Tasks/Calendar/Analytics/Settings sub-menu, mirroring the
                // product's project tabs so work can be jumped to directly.
                <div>
                  <div className="mb-2 flex items-center justify-between px-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Projects
                    </p>
                    <NavLink
                      to={projectsListPath}
                      onClick={onClose}
                      className="text-slate-400 transition-colors hover:text-slate-600"
                      aria-label="View all projects"
                    >
                      <ArrowRight size={14} />
                    </NavLink>
                  </div>

                  {projects.length === 0 ? (
                    <p className="px-3 text-[13px] text-slate-400">No projects yet.</p>
                  ) : (
                    <div className="space-y-0.5">
                      {projects.map((project) => {
                        const isExpanded = expandedProjectId === project.id;
                        const isOnProject = location.pathname === `/app/projects/${project.id}`;

                        return (
                          <div key={project.id}>
                            <button
                              type="button"
                              onClick={() => toggleProject(project.id)}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                isOnProject
                                  ? "text-slate-900"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                              <span className="min-w-0 flex-1 truncate text-left">
                                {project.name}
                              </span>
                              {isExpanded ? (
                                <ChevronDown size={14} className="shrink-0 text-slate-400" />
                              ) : (
                                <ChevronRight size={14} className="shrink-0 text-slate-400" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="mt-0.5 space-y-0.5">
                                {visibleProjectTabs.map((tab) => {
                                  const isActive = isOnProject && activeProjectTab === tab.id;

                                  return (
                                    <NavLink
                                      key={tab.id}
                                      to={`/app/projects/${project.id}?tab=${tab.id}`}
                                      onClick={onClose}
                                      className={`flex items-center gap-2.5 rounded-lg border-l-2 py-1.5 pl-9 pr-3 text-[13px] font-medium transition-colors ${
                                        isActive
                                          ? "border-blue-600 bg-blue-50 text-blue-700"
                                          : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                      }`}
                                    >
                                      <tab.icon size={15} className="shrink-0" />
                                      <span>{tab.label}</span>
                                    </NavLink>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </Fragment>
          ))}
        </nav>

        {/* User */}
        {/* <div className="shrink-0 border-t border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
              {(user?.name || "A").charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {user?.name || "Admin"}
              </p>
              <p className="truncate text-xs capitalize text-slate-500">
                {user?.role || "admin"}
              </p>
            </div>
          </div>
        </div> */}
      </aside>
    </>
  );
};

export default AdminSidebar;
