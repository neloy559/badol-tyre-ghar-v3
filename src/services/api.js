import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  
  if (import.meta.env.DEV) {
    return 'http://localhost:5000/api/v1';
  }

  // Detect APK/PWA/Capacitor execution
  const isCapacitor = window.Capacitor !== undefined || window.cordova !== undefined;
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isFileProtocol = window.location.protocol === 'file:' || window.location.protocol === 'capacitor:';

  if (isCapacitor || isLocalHost || isFileProtocol) {
    return 'https://badol-tyre-ghar.vercel.app/api/v1';
  }

  return '/api/v1';
};

const baseURL = getBaseUrl();

// 1. Standard API Instance (with interceptors)
const api = axios.create({
  baseURL,
  withCredentials: true,
});

// 2. Auth API Instance (Dedicated for login/refresh, NO interceptors to avoid loops)
export const authApi = axios.create({
  baseURL,
  withCredentials: true,
});

let accessToken = null;
let authHandlers = {
  onLogout: () => {},
  onRefresh: () => Promise.resolve(null),
};

api.setAccessToken = (token) => {
  accessToken = token;
};

api.registerAuthHandlers = (handlers) => {
  authHandlers = { ...authHandlers, ...handlers };
};

// ── Request Interceptor ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor (The Magic) ───────────────────────────
// Refresh mutex — prevents multiple concurrent 401s from each calling
// onRefresh() simultaneously, which would rotate the token multiple times
// and cause the second/third calls to get 401 from /auth/refresh,
// triggering onLogout() even though the first refresh succeeded.
let isRefreshing = false;
let refreshQueue = []; // pending requests waiting for the new token

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another refresh is already in flight — queue this request
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await authHandlers.onRefresh();
        if (newToken) {
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          processQueue(new Error('Refresh returned null'));
          authHandlers.onLogout();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError);
        authHandlers.onLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
