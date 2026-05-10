import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="bg-background text-primaryText min-h-screen">
      <Sidebar />

      <main className="ml-64 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
