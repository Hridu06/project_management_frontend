import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import ChangePasswordModal from "../common/ChangePasswordModal";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Attendance Management",
  },
  "my-dashboard": {
    title: "Dashboard",
    subtitle: "Your project activity",
  },
  tasks: {
    title: "My Tasks",
    subtitle: "Assigned by your manager or team lead",
  },
  "my-profile": {
    title: "My Profile",
    subtitle: "View and edit your details",
  },
  employees: {
    title: "Employees",
    subtitle: "Manage employee records",
  },
  managers: {
    title: "Managers",
    subtitle: "Manage manager accounts",
  },
  projects: {
    title: "Projects",
    subtitle: "Manage projects and assignments",
  },
  attendance: {
    title: "Attendance",
    subtitle: "Project-based attendance tracking",
  },
  leave: {
    title: "Leave",
    subtitle: "Manage leave requests",
  },
  reports: {
    title: "Reports",
    subtitle: "Attendance and contribution reports",
  },
  settings: {
    title: "Settings",
    subtitle: "System and account preferences",
  },
};

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const primarySegment = location.pathname.split("/").filter(Boolean)[1] ?? "dashboard";
  const { title: pageTitle, subtitle: pageSubtitle } =
    pageTitles[primarySegment] ?? pageTitles.dashboard;

  const displayName = user?.name || "Admin";
  const displayRole = user?.role ?? "admin";

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-16 md:h-20 border-b border-slate-200 bg-white md:left-64">
      <div className="flex h-full items-center justify-between gap-2 px-3 sm:px-4 md:px-6">
        {/* Left Section */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {/* Mobile / Sidebar Toggle */}
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-lg p-1.5 sm:p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} className="sm:w-5 sm:h-5" />
          </button>

          {/* Page Title */}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm sm:text-base md:text-lg font-semibold text-slate-900">
              {pageTitle}
            </h2>
            <p className="hidden sm:block text-xs text-slate-500 truncate">
              {pageSubtitle}
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
          {/* Theme Toggle - Always visible on mobile */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-lg p-1.5 sm:p-2 md:p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun size={16} className="sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" />
            ) : (
              <Moon size={16} className="sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" />
            )}
          </button>

          {/* Search - Always visible on mobile */}
          <button
            type="button"
            className="rounded-lg p-1.5 sm:p-2 md:p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Search"
          >
            <Search size={16} className="sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" />
          </button>

          {/* Notification */}
          <button
            type="button"
            className="relative rounded-lg p-1.5 sm:p-2 md:p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Notifications"
          >
            <Bell size={16} className="sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" />
            {/* Notification Badge */}
            <span className="absolute right-1 top-1 flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500" />
          </button>

          {/* Divider - Hidden on smaller screens */}
          <div className="hidden sm:block mx-1 sm:mx-2 h-6 sm:h-7 md:h-8 w-px bg-slate-200" />

          {/* Profile */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-1.5 sm:gap-2 md:gap-3 rounded-lg px-1.5 sm:px-2 py-1 transition-colors hover:bg-slate-50"
            >
              {/* Avatar */}
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 items-center justify-center rounded-full bg-blue-600 text-xs sm:text-sm font-semibold text-white flex-shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>

              {/* User Info - Hidden on smaller screens */}
              <div className="hidden sm:block min-w-0">
                <p className="text-xs md:text-sm font-semibold text-slate-800 truncate max-w-[80px] md:max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-[10px] md:text-xs text-slate-500 capitalize">
                  {displayRole}
                </p>
              </div>

              <ChevronDown
                size={14}
                className="hidden sm:block text-slate-400 flex-shrink-0"
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 sm:mt-2 w-44 sm:w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setPasswordModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <KeyRound size={14} className="sm:w-4 sm:h-4" />
                  Change Password
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  <LogOut size={14} className="sm:w-4 sm:h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </header>
  );
};

export default Topbar;