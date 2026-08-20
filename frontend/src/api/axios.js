import axios from "axios";

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

// ─── Auth routes that must NEVER trigger the refresh interceptor ──────────────

const AUTH_BYPASS_PATTERNS = [
  /\/auth\/login/,
  /\/auth\/register/,
  /\/auth\/refresh/,
  /\/auth\/logout/,
  /\/auth\/forgot-password/,
  /\/auth\/reset-password/,
];

const isAuthBypassRoute = (url = "") =>
  AUTH_BYPASS_PATTERNS.some((pattern) => pattern.test(url));

// ─── Request interceptor ─────────────────────────────────────────────────────

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

    if (isAuthBypassRoute(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
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
        setAccessToken(newToken);
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
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
