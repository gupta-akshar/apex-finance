import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

// ─── Refresh queue state ──────────────────────────────────────────────────────
// Ensures only ONE refresh call runs at a time.
// Any other 401s that arrive while a refresh is in-flight are queued and
// retried once the refresh resolves, instead of each triggering their own refresh.
let isRefreshing = false;
let failedQueue = []; // [{ resolve, reject }]

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Request interceptor ─────────────────────────────────────────────────────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor ────────────────────────────────────────────────────
API.interceptors.response.use(
  (response) => response,

  async (error) => {
    // No config means the request never left — nothing to retry
    if (!error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // If the refresh endpoint itself returned 401, bail immediately.
    // Don't redirect here — let the caller (below) handle logout.
    if (originalRequest.url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // If a refresh is already in-flight, queue this request
      // and wait for the refresh to complete before retrying
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Mark as retried so we don't loop
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log("🔁 Access token expired → trying refresh...");

        // Use axios directly here, not the API instance,
        // so this call does NOT go through our interceptor again
        const res = await axios.post(
          "http://localhost:5000/api/auth/refresh",
          {},
          { withCredentials: true },
        );

        if (!res.data?.accessToken) {
          throw new Error("No access token returned from refresh endpoint");
        }

        const newToken = res.data.accessToken;

        // Persist and update defaults
        localStorage.setItem("accessToken", newToken);
        API.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

        // Release all queued requests with the new token
        processQueue(null, newToken);

        console.log("✅ Token refreshed successfully");

        // Retry the original failed request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        console.error("❌ Refresh failed:", refreshError);

        // Reject all queued requests
        processQueue(refreshError, null);

        // Clean up auth state
        localStorage.removeItem("accessToken");

        // ✅ Dispatch a custom event instead of window.location.href
        // AuthProvider listens for this and calls navigate("/login")
        // This avoids a full page reload
        window.dispatchEvent(new Event("auth:logout"));

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default API;
