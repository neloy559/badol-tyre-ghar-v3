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
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    // Note: We don't need isAuthPath check here anymore because auth calls 
    // use 'authApi' which doesn't have this interceptor!
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await authHandlers.onRefresh();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        authHandlers.onLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
