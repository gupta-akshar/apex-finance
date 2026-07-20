import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../constants/routes";

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: "▦" },
  { to: ROUTES.TRANSACTIONS, label: "Transactions", icon: "↕" },
  { to: ROUTES.CATEGORIES, label: "Categories", icon: "◈" },
  { to: ROUTES.REPORTS, label: "Reports", icon: "◉" },
  { to: ROUTES.RECURRING, label: "Recurring", icon: "↺" },
];

const Sidebar = () => {
  const [open, setOpen] = useState(false);

  // Close sidebar on ESC key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const linkBase =
    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-secondaryText hover:bg-[#1f1f23] hover:text-primaryText transition-colors duration-150";
  const activeClass = "bg-[#1f1f23] text-primaryText font-medium";

  const navLinks = NAV_ITEMS.map(({ to, label, icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setOpen(false)}
      className={({ isActive }) => `${linkBase} ${isActive ? activeClass : ""}`}
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </NavLink>
  ));

  const sidebarContent = (
    <aside className="h-full w-64 bg-card border-r border-border flex flex-col overflow-y-auto">
      <div className="px-5 py-5 border-b border-border shrink-0">
        <span className="text-base font-bold tracking-tight text-primaryText">
          💸 ExpenseTracker
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">{navLinks}</nav>
      <div className="px-5 py-4 border-t border-border shrink-0">
        <p className="text-xs text-secondaryText/60">v1.0.0</p>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop: fixed sidebar (lg and above) ── */}
      <div className="hidden lg:block fixed left-0 top-0 z-20 h-screen w-64">
        {sidebarContent}
      </div>

      {/* ── Mobile: hamburger button ── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="lg:hidden fixed top-4 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-lg bg-card border border-border text-primaryText hover:bg-[#1f1f23] transition-colors shadow-md"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* ── Mobile: backdrop overlay ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      <div
        className={[
          "lg:hidden fixed left-0 top-0 z-40 h-screen w-64",
          "transition-transform duration-250 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
