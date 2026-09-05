import axios, { AxiosError } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

const API_BASE = "http://localhost:5000/api";
const TOKEN_KEY = "clientnest.token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

// Create Axios instance with a 10-second timeout to allow Neon DB to wake up
const api = axios.create({ 
  baseURL: API_BASE, 
  timeout: 10000 
});

// Attach JWT token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const t = getToken();
  if (t && config.headers) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

// Handle 401 Unauthorized — reject the promise so TanStack Query handles
// the error state (isError, refetch, etc.). The app uses React Router
// Navigate components for auth-required routes, not hard redirects in
// an interceptor, which avoids white-screen flash and redirect loops.
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      setToken(null);
    }
    return Promise.reject(error);
  }
);

export default api;