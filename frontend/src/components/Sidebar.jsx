import { NavLink } from "react-router-dom";

const Sidebar = () => {
  const linkBase =
    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-secondaryText hover:bg-[#1f1f23] hover:text-primaryText transition-colors duration-150";

  const activeClass = "bg-[#1f1f23] text-primaryText font-medium";

  const navItem = (to, label, icon) => (
    <NavLink
      to={to}
      className={({ isActive }) => `${linkBase} ${isActive ? activeClass : ""}`}
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </NavLink>
  );

  return (
    <aside
      className={[
        "fixed left-0 top-0 z-20",
        "h-screen w-64",
        "bg-card border-r border-border",
        "flex flex-col",
        "overflow-y-auto",
      ].join(" ")}
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border shrink-0">
        <span className="text-base font-bold tracking-tight text-primaryText">
          💸 ExpenseTracker
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItem("/dashboard", "Dashboard", "▦")}
        {navItem("/transactions", "Transactions", "↕")}
        {navItem("/categories", "Categories", "◈")}
        {navItem("/reports", "Reports", "◉")}
        {navItem("/recurring", "Recurring", "↺")}
      </nav>

      {/* Footer hint */}
      <div className="px-5 py-4 border-t border-border shrink-0">
        <p className="text-xs text-secondaryText/60">v1.0.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
