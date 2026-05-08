import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ─── Fetch current user ──────────────────────────────────────────────────
  // Keep this simple — just fetch /auth/me.
  // The axios interceptor handles 401s and token refresh automatically.
  // DO NOT manually retry refresh here — that conflicts with the interceptor.
  const fetchUser = useCallback(async () => {
    try {
      const res = await API.get("/auth/me");
      setUser(res.data.user || res.data);
    } catch {
      // Interceptor already attempted a refresh and it failed.
      // Just clear the user — the auth:logout event will redirect.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Listen for forced logout from axios interceptor ────────────────────
  // When refresh token is expired/invalid, axios fires this event
  // instead of doing window.location.href (which would cause a reload)
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      navigate("/login");
    };

    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, [navigate]);

  // ─── Initial session check ───────────────────────────────────────────────
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // ─── Login ───────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    const { accessToken, user: userData } = res.data;

    localStorage.setItem("accessToken", accessToken);

    // Update axios default so next request uses the new token immediately
    API.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    // Use user data from login response directly — no need for a second
    // round-trip to /auth/me
    setUser(userData);

    return res.data;
  };

  // ─── Register ────────────────────────────────────────────────────────────
  const register = async (name, email, password) => {
    const res = await API.post("/auth/register", { name, email, password });
    const { accessToken, user: userData } = res.data;

    localStorage.setItem("accessToken", accessToken);
    API.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    setUser(userData);

    return res.data;
  };

  // ─── Logout ──────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      // Tell the server to invalidate the refresh token cookie
      await API.post("/auth/logout");
    } catch (err) {
      // Log but don't block local logout — we still clear everything.
      // If this fails, the refresh token stays alive on the server until
      // it naturally expires, but the user is logged out locally.
      console.error("Logout API error:", err);
    } finally {
      localStorage.removeItem("accessToken");
      delete API.defaults.headers.common["Authorization"];
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
