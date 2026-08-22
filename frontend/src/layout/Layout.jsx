import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  // Mirror the sidebar collapse state so the main content area can offset correctly
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  return (
    <div className="bg-background text-primaryText min-h-screen">
      <Sidebar onCollapsedChange={setSidebarCollapsed} />

      <main
        className={`min-h-screen overflow-y-auto transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]
    ${sidebarCollapsed ? "lg:ml-14" : "lg:ml-60"}
  `}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
