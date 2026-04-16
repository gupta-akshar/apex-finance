import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-card border-b border-border px-6 py-4 flex justify-between items-center">
      {/* Left side - Logo / Title */}
      <div>
        <Link
          to="/"
          className="text-2xl font-bold hover:text-accent transition"
        >
          ExpenseTracker
        </Link>
      </div>

      {/* Right side - Buttons */}
      <div className="flex gap-4 items-center">
        {user ? (
          <>
            <span className="text-secondaryText hidden md:inline">
              Hi, {user.name}
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="border border-border px-4 py-2 rounded-lg hover:bg-[#1f1f23] transition"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate("/login")}
              className="border border-border px-4 py-2 rounded-lg hover:bg-[#1f1f23] transition"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="bg-accent hover:bg-accentHover px-4 py-2 rounded-lg text-white transition"
            >
              Register
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
