import { useState, useEffect, useCallback } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import { useAuth } from "../hooks/useAuth";

const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: "▦" },
  { to: ROUTES.TRANSACTIONS, label: "Transactions", icon: "↕" },
  { to: ROUTES.CATEGORIES, label: "Categories", icon: "◈" },
  { to: ROUTES.REPORTS, label: "Reports", icon: "◉" },
  { to: ROUTES.RECURRING, label: "Recurring", icon: "↺" },
];

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 56;

// ── Logo — matches the login page branding exactly ─────────────────────────

const AppLogo = ({ collapsed = false, onClick }) => (
  <Link
    to={ROUTES.HOME}
    onClick={onClick}
    className={`flex items-center min-w-0 group ${
      collapsed ? "justify-center" : "gap-3"
    }`}
  >
    <img
      src="/logo.svg"
      alt="ExpenseTracker"
      className="w-8 h-8 shrink-0 transition-transform duration-300 group-hover:scale-105"
    />

    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        maxWidth: collapsed ? "0px" : "180px",
        opacity: collapsed ? 0 : 1,
      }}
    >
      <h2
        className="text-sm font-bold tracking-tight text-primaryText leading-none whitespace-nowrap"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        ExpenseTracker
      </h2>

      <p className="text-[10px] text-secondaryText mt-1 whitespace-nowrap">
        Personal Finance Platform
      </p>
    </div>
  </Link>
);

// ── Collapse toggle button ──────────────────────────────────────────────────

const CollapseToggle = ({ collapsed, onClick }) => (
  <button
    onClick={onClick}
    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    className="w-7 h-7 flex items-center justify-center rounded-md text-secondaryText hover:text-primaryText hover:bg-[#1f1f23] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/50 shrink-0"
  >
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{
        transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.25s ease",
      }}
    >
      <path
        d="M9 11L5 7l4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </button>
);

// ── Nav link ────────────────────────────────────────────────────────────────

const NavItem = ({ to, label, icon, collapsed, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      `
    flex items-center rounded-lg text-sm transition-all duration-150
    hover:bg-[#1f1f23] hover:text-primaryText
    focus:outline-none focus:ring-2 focus:ring-accent/40
    ${collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-2.5 px-3 py-2"}
    ${
      isActive
        ? "bg-[#1f1f23] text-primaryText font-medium"
        : "text-secondaryText"
    }
  `
    }
  >
    <span className={`text-base leading-none shrink-0 ${collapsed ? "" : ""}`}>
      {icon}
    </span>{" "}
    <span
      className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out"
      style={{
        maxWidth: collapsed ? "0px" : "160px",
        opacity: collapsed ? 0 : 1,
      }}
    >
      {label}
    </span>
  </NavLink>
);

// ── User footer ─────────────────────────────────────────────────────────────

const UserFooter = ({ user, onLogout, collapsed }) => (
  <div
    className={`border-t border-border shrink-0 transition-all duration-300 ${
      collapsed ? "px-0 py-3" : "px-3 py-3"
    }`}
  >
    {!collapsed && user && (
      <div className="flex items-center gap-2.5 mb-2 px-1">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
        >
          {user.name?.[0]?.toUpperCase() ?? "U"}
        </div>
        <div className="min-w-0 overflow-hidden">
          <p
            className="text-xs font-medium text-primaryText truncate"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {user.name}
          </p>
          <p
            className="text-[10px] text-secondaryText/60 truncate"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {user.email}
          </p>
        </div>
      </div>
    )}
    <button
      onClick={onLogout}
      title={collapsed ? "Sign out" : undefined}
      className={[
        "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-secondaryText",
        "hover:text-red-400 hover:bg-red-400/10 transition-all duration-150",
        "focus:outline-none focus:ring-2 focus:ring-red-400/30",
        collapsed ? "justify-center h-10 w-10 mx-auto px-0" : "",
      ].join(" ")}
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span
        className="overflow-hidden whitespace-nowrap transition-all duration-300"
        style={{
          maxWidth: collapsed ? "0px" : "120px",
          opacity: collapsed ? 0 : 1,
        }}
      >
        Sign out
      </span>
    </button>
  </div>
);

// ── Main Sidebar ─────────────────────────────────────────────────────────────

const Sidebar = ({ onCollapsedChange }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      // Notify Layout so it can adjust margin
      onCollapsedChange?.(next);
      return next;
    });
  }, [onCollapsedChange]);

  // Close mobile drawer on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLogout = useCallback(async () => {
    setMobileOpen(false);
    await logout();
    navigate("/");
  }, [logout, navigate]);

  const sidebarContent = (
    <aside
      className="h-full bg-card border-r border-border flex flex-col overflow-hidden"
      style={{
        width: collapsed
          ? `${SIDEBAR_COLLAPSED_WIDTH}px`
          : `${SIDEBAR_WIDTH}px`,
        transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        minWidth: collapsed
          ? `${SIDEBAR_COLLAPSED_WIDTH}px`
          : `${SIDEBAR_WIDTH}px`,
      }}
    >
      {/* Header */}
      <div
        className={`flex items-center px-3 py-4 border-b border-border shrink-0 min-h-[57px]
  ${collapsed ? "justify-center" : "justify-between"}`}
      >
        <AppLogo collapsed={collapsed} />
        {!collapsed && (
          <CollapseToggle collapsed={collapsed} onClick={toggleCollapse} />
        )}

        {collapsed && (
          <CollapseToggle collapsed={collapsed} onClick={toggleCollapse} />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavItem
            key={to}
            to={to}
            label={label}
            icon={icon}
            collapsed={collapsed}
            onClick={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* Footer */}
      <UserFooter user={user} onLogout={handleLogout} collapsed={collapsed} />

      {/* Version */}
      {!collapsed && (
        <div
          className="px-4 pb-3 transition-opacity duration-200"
          style={{ opacity: collapsed ? 0 : 1 }}
        >
          <p
            className="text-[10px] text-secondaryText/40"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            v1.0.0
          </p>
        </div>
      )}
    </aside>
  );

  return (
    <>
      {/* ── Desktop: fixed sidebar ── */}
      <div
        className="hidden lg:block fixed left-0 top-0 z-20 h-screen"
        style={{
          width: collapsed
            ? `${SIDEBAR_COLLAPSED_WIDTH}px`
            : `${SIDEBAR_WIDTH}px`,
          transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {sidebarContent}
      </div>

      {/* ── Mobile: hamburger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="lg:hidden fixed top-3.5 left-4 z-30 w-9 h-9 flex items-center justify-center rounded-lg bg-card border border-border text-primaryText hover:bg-[#1f1f23] transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-accent/50"
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

      {/* ── Mobile: backdrop ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile: drawer (always full width, no collapse) ── */}
      <div
        className={[
          "lg:hidden fixed left-0 top-0 z-40 h-screen",
          "transition-transform duration-250 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ width: "240px" }}
      >
        {/* Force expanded on mobile */}
        <aside className="h-full bg-card border-r border-border flex flex-col overflow-hidden w-[240px]">
          <div className="flex items-center justify-between px-3 py-4 border-b border-border shrink-0">
            <AppLogo collapsed={false} onClick={() => setMobileOpen(false)} />
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="w-7 h-7 flex items-center justify-center rounded-md text-secondaryText hover:text-primaryText hover:bg-[#1f1f23] transition-colors focus:outline-none"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M1 1l10 10M11 1L1 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <NavItem
                key={to}
                to={to}
                label={label}
                icon={icon}
                collapsed={false}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>
          <UserFooter user={user} onLogout={handleLogout} collapsed={false} />
          <div className="px-4 pb-3">
            <p
              className="text-[10px] text-secondaryText/40"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              v1.0.0
            </p>
          </div>
        </aside>
      </div>
    </>
  );
};

export default Sidebar;
