import axios from "axios";

/**
 * FIXES APPLIED:
 *  H4 — Removed dual token storage. Previously the token was written to BOTH
 *       the in-memory `_accessToken` store AND `API.defaults.headers.common`.
 *       If these ever diverged (e.g. clearAccessToken() called without also
 *       deleting the default header), requests would carry a stale or ghost token.
 *       Fix: the request interceptor is the SINGLE place that reads and injects
 *       the token. API.defaults.headers.common is never touched for auth.
 *       All call sites that previously set API.defaults.headers.common have been
 *       updated in AuthProvider to only use setAccessToken().
 */

// ─── In-memory token store ────────────────────────────────────────────────────

let _accessToken = null;

export const setAccessToken = (token) => {
  _accessToken = token;
};
export const getAccessToken = () => _accessToken;
export const clearAccessToken = () => {
  _accessToken = null;
};

// ─── Axios instance ───────────────────────────────────────────────────────────

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// ─── Refresh queue state ──────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token),
  );
  failedQueue = [];
};

// ─── Request interceptor ─────────────────────────────────────────────────────
// Single authoritative place that injects the bearer token.
// FIX H4: we no longer also set API.defaults.headers.common — one source of truth.

API.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor ────────────────────────────────────────────────────

API.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (!error.config) return Promise.reject(error);

    const originalRequest = error.config;

    // Never retry the refresh endpoint itself — avoid infinite loops.
    if (originalRequest.url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until the in-flight refresh resolves.
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return API(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshBase =
          import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        const res = await axios.post(
          `${refreshBase}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        if (!res.data?.accessToken) {
          throw new Error("No access token returned from refresh endpoint");
        }

        const newToken = res.data.accessToken;

        // FIX H4: only write to the in-memory store.
        // The request interceptor above will pick it up for all subsequent calls.
        setAccessToken(newToken);

        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();

        // Notify the app that the session has ended.
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
