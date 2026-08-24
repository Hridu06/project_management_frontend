import { useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/layout/AdminSidebar";
import Topbar from "../components/layout/Topbar";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell min-h-screen bg-slate-100 print:bg-white">
      {/* Sidebar */}
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Area */}
      <div className="md:ml-64 print:ml-0">
        {/* Topbar */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <main className="pt-20 print:pt-0">
          <div className="p-4 sm:p-6 print:p-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;