import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API, { setAccessToken, clearAccessToken } from "../api/axios";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── Listen for forced logout events from the Axios interceptor ────────────
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      navigate("/login");
    };
    window.addEventListener("auth:logout", handleForcedLogout);
    return () => window.removeEventListener("auth:logout", handleForcedLogout);
  }, [navigate]);

  // ── Restore session on page load via refresh token cookie ─────────────────
  const initRanRef = useRef(false);

  useEffect(() => {
    if (initRanRef.current) return;
    initRanRef.current = true;

    const init = async () => {
      try {
        const refreshBase =
          import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const refreshRes = await axios.post(
          `${refreshBase}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const { accessToken } = refreshRes.data;
        setAccessToken(accessToken);

        const meRes = await API.get("/auth/me");
        setUser(meRes.data.user || meRes.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await API.post("/auth/login", { email, password });
    const { accessToken, user: userData } = res.data;
    setAccessToken(accessToken);
    setUser(userData);
    return res.data;
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (name, email, password) => {
    const res = await API.post("/auth/register", { name, email, password });
    const { accessToken, user: userData } = res.data;
    setAccessToken(accessToken);
    setUser(userData);
    return res.data;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await API.post("/auth/logout");
    } catch {
      // API call failing does not prevent client-side logout
    } finally {
      clearAccessToken();
      setUser(null);
      navigate("/login");
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
