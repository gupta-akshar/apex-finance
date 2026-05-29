import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ─── Fetch current user ──────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    try {
      const res = await API.get("/auth/me");
      setUser(res.data.user || res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Listen for forced logout from axios interceptor ────────────────────
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

    API.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

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
      await API.post("/auth/logout");
    } catch (err) {
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
