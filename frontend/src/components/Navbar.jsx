import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Subtle border appears once user scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route navigation
  const go = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-all duration-200",
        scrolled
          ? "border-b border-[#27272a] bg-[#0f0f11]/90 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-16">
          {/* ── Logo ── */}
          <Link
            to="/"
            className="flex items-center gap-2 group focus:outline-none"
            onClick={() => setMobileOpen(false)}
          >
            <span className="text-xl">💸</span>
            <span
              className="text-sm font-bold text-white tracking-tight group-hover:text-[#a5b4fc] transition-colors duration-150"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              ExpenseTracker
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-1">
            {user ? (
              /* ── Authenticated ── */
              <>
                <span className="text-sm text-[#71717a] px-3">
                  Hi,{" "}
                  <span className="text-[#a1a1aa] font-medium">
                    {user.name}
                  </span>
                </span>

                <Link
                  to="/dashboard"
                  className="text-sm text-[#a1a1aa] hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#18181b] transition-all duration-150"
                >
                  Dashboard
                </Link>

                <button
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="ml-2 text-sm text-[#a1a1aa] hover:text-white px-4 py-1.5 rounded-lg border border-[#27272a] hover:border-[#3f3f46] hover:bg-[#18181b] transition-all duration-150"
                >
                  Log out
                </button>
              </>
            ) : (
              /* ── Guest ── */
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm text-[#a1a1aa] hover:text-white px-4 py-1.5 rounded-lg hover:bg-[#18181b] transition-all duration-150"
                >
                  Sign in
                </button>

                <button
                  onClick={() => navigate("/register")}
                  className="ml-1 relative text-sm font-medium text-white px-5 py-1.5 rounded-lg overflow-hidden transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6366f1]/60 focus:ring-offset-2 focus:ring-offset-[#0f0f11] group"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
                  }}
                >
                  <span className="relative z-10">Get started</span>
                  <span
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)",
                    }}
                  />
                </button>
              </>
            )}
          </nav>

          {/* ── Mobile hamburger ── */}
          <button
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="md:hidden w-8 h-8 flex flex-col justify-center items-center gap-[5px] rounded-lg hover:bg-[#18181b] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6366f1]/50"
          >
            <span
              className={[
                "block w-5 h-px bg-[#a1a1aa] origin-center transition-all duration-200",
                mobileOpen ? "rotate-45 translate-y-[6px]" : "",
              ].join(" ")}
            />
            <span
              className={[
                "block w-5 h-px bg-[#a1a1aa] transition-all duration-200",
                mobileOpen ? "opacity-0 scale-x-0" : "",
              ].join(" ")}
            />
            <span
              className={[
                "block w-5 h-px bg-[#a1a1aa] origin-center transition-all duration-200",
                mobileOpen ? "-rotate-45 -translate-y-[6px]" : "",
              ].join(" ")}
            />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <div
        className={[
          "md:hidden overflow-hidden transition-all duration-200 ease-in-out",
          mobileOpen ? "max-h-64 border-b border-[#27272a]" : "max-h-0",
        ].join(" ")}
        style={{ background: "#0f0f11" }}
      >
        <div className="px-6 py-4 space-y-1">
          {user ? (
            <>
              <p className="text-xs text-[#52525b] py-2 font-medium uppercase tracking-wider">
                Signed in as {user.name}
              </p>
              <button
                onClick={() => go("/dashboard")}
                className="block w-full text-left text-sm text-[#a1a1aa] hover:text-white px-3 py-2.5 rounded-lg hover:bg-[#18181b] transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                  navigate("/");
                }}
                className="block w-full text-left text-sm text-[#a1a1aa] hover:text-red-400 px-3 py-2.5 rounded-lg hover:bg-[#18181b] transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => go("/login")}
                className="block w-full text-left text-sm text-[#a1a1aa] hover:text-white px-3 py-2.5 rounded-lg hover:bg-[#18181b] transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => go("/register")}
                className="block w-full text-left text-sm font-medium text-white px-3 py-2.5 rounded-lg transition-colors"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                }}
              >
                Get started free →
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
