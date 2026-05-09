import { NavLink } from "react-router-dom";

const Sidebar = () => {
  const linkClass =
    "block px-4 py-2 rounded-lg text-secondaryText hover:bg-card hover:text-primaryText transition";

  const activeClass = "bg-card text-primaryText";

  return (
    <div className="w-64 h-screen bg-card border-r border-border p-6">
      <h1 className="text-xl font-bold mb-8">Expense Tracker</h1>

      <nav className="space-y-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : ""}`
          }
        >
          Dashboard
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : ""}`
          }
        >
          Transactions
        </NavLink>

        <NavLink
          to="/categories"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : ""}`
          }
        >
          Categories
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `${linkClass} ${isActive ? activeClass : ""}`
          }
        >
          Reports
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;
