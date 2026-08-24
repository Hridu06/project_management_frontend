import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserCheck,
  Users2,
  FolderKanban,
  Clock3,
  CalendarDays,
  BarChart3,
  Settings,
  ListChecks,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth, type Role } from "../../context/AuthContext";
import logo from "../../assets/Nanosoft.png";

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
        to: "/app/my-profile",
        label: "My Profile",
        icon: UserCircle,
        roles: ["employee"],
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
        sub: [
          {
            to: "/app/projects/contributions",
            label: "Contributions",
            icon: ListChecks,
            roles: ["admin"],
          },
        ],
      },
      {
        to: "/app/my-projects",
        label: "Projects",
        icon: FolderKanban,
        roles: ["employee"],
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
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>

              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, sub }) => (
                  <div key={to}>
                    <NavLink
                      to={to}
                      end={Boolean(sub)}
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
          ))}
        </nav>

        {/* User */}
        <div className="shrink-0 border-t border-slate-100 px-4 py-4">
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
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
