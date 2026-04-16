import { useState, useEffect } from "react";
import axios from "../api/axios";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await axios.get("/auth/me");
      setUser(res.data);
    } catch {
      try {
        const refreshRes = await axios.post("/auth/refresh");
        const newAccessToken = refreshRes.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);

        const res = await axios.get("/auth/me");
        setUser(res.data);
      } catch {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email, password) => {
    const res = await axios.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", res.data.accessToken);
    await fetchUser();
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await axios.post("/auth/register", { name, email, password });
    localStorage.setItem("accessToken", res.data.accessToken);
    await fetchUser();
    return res.data;
  };

  const logout = async () => {
    await axios.post("/auth/logout");
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
