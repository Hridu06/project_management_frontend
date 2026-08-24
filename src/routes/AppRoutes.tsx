import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "../pages/auth/Login";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import Employees from "../pages/admin/Employees";
import EmployeeProfile from "../pages/employees/profile";
import EmployeeDashboard from "../pages/employees/dashboard";
import EmployeeTasks from "../pages/employees/tasks";
import EmployeeProjects from "../pages/employees/projects";
import EmployeeMyProfile from "../pages/employees/my-profile";
import ManagerDashboard from "../pages/managers/dashboard";
import Users from "../pages/admin/Users";
import Managers from "../pages/admin/Managers";
import Teams from "../pages/admin/Teams";
import Projects from "../pages/admin/Projects";
import ProjectDetail from "../pages/admin/ProjectDetail";
import Contributions from "../pages/admin/Contributions";
import Attendance from "../pages/admin/Attendance";
import EmployeeAttendanceCalendar from "../pages/admin/EmployeeAttendanceCalendar";
import Leave from "../pages/admin/Leave";
import Reports from "../pages/admin/Reports";
import Settings from "../pages/admin/Settings";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

// Admins, employees, and managers each land on their own scoped Dashboard.
const AdminHomeRedirect = () => {
  const { user } = useAuth();

  if (user?.role === "admin") return <Navigate to="dashboard" replace />;
  if (user?.role === "employee") return <Navigate to="my-dashboard" replace />;
  if (user?.role === "manager") return <Navigate to="manager-dashboard" replace />;
  return <Navigate to="teams" replace />;
};

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Signed-in (any role) */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "manager", "employee"]} />}>
          <Route path="/app" element={<AdminLayout />}>
            <Route index element={<AdminHomeRedirect />} />

            {/* Read-only for employees; admins and managers can also create
                and edit teams (delete stays admin-only). Write actions are
                hidden/blocked inside the page itself and enforced server-side. */}
            <Route path="teams" element={<Teams />} />

            {/* Project detail is shared: employees land here from their own
                My Projects summary, admins/managers from the full list. */}
            <Route path="projects/:projectId" element={<ProjectDetail />} />

            {/* The full projects list/management view is admin & manager
                only — employees get their own scoped summary at
                my-projects (see the employee-only block below) instead. */}
            <Route element={<ProtectedRoute allowedRoles={["admin", "manager"]} />}>
              <Route path="projects" element={<Projects />} />
            </Route>

            {/* Employee-only */}
            <Route element={<ProtectedRoute allowedRoles={["employee"]} />}>
              <Route path="my-dashboard" element={<EmployeeDashboard />} />
              <Route path="tasks" element={<EmployeeTasks />} />
              <Route path="my-projects" element={<EmployeeProjects />} />
              <Route path="my-profile" element={<EmployeeMyProfile />} />
            </Route>

            {/* Manager-only */}
            <Route element={<ProtectedRoute allowedRoles={["manager"]} />}>
              <Route path="manager-dashboard" element={<ManagerDashboard />} />
            </Route>

            {/* Admin-only modules */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="employees" element={<Employees />} />
              <Route path="employees/:employeeId" element={<EmployeeProfile />} />
              <Route path="users" element={<Users />} />
              <Route path="managers" element={<Managers />} />
              <Route path="projects/contributions" element={<Contributions />} />
              <Route path="attendance" element={<Attendance />} />
              <Route
                path="attendance/:employeeId"
                element={<EmployeeAttendanceCalendar />}
              />
              <Route path="leave" element={<Leave />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        {/* Default */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* 404 */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
