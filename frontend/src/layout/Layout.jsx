import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div className="bg-background text-primaryText min-h-screen">
      <Sidebar />

      <main className="lg:ml-64 min-h-screen overflow-y-auto">
        <div className="pt-0 lg:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
