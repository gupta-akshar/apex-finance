import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

// Attach access token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // prevent loop
    if (originalRequest.url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log("🔁 Access token expired → trying refresh...");

        const res = await API.post("/auth/refresh");

        if (!res.data?.accessToken) {
          throw new Error("No access token returned");
        }

        const newAccessToken = res.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);

        // 🔥 update globally + retry request
        API.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        console.log("✅ Token refreshed");

        return API(originalRequest);
      } catch (refreshError) {
        console.error("❌ REFRESH TOKEN FAILED:", refreshError);

        localStorage.removeItem("accessToken");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default API;
