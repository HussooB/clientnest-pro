import axios, { AxiosError } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { handleMock } from "./mockdb";

// NOTE (SRS integration fix): baseURL already contains `/api`, so every call
// in the app uses paths WITHOUT the `/api` prefix (e.g. `/leads`, `/clients`).
const API_BASE = "http://localhost:5000/api";
const TOKEN_KEY = "clientnest.token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

// Demo-data fallback: when the backend at localhost:5000 is unreachable the
// app transparently switches to an in-browser API with seeded data so every
// screen remains fully functional. The UI surfaces a "Demo data" badge.
type DemoListener = (v: boolean) => void;
const demoListeners = new Set<DemoListener>();
let demoMode = false;

export const isDemoMode = () => demoMode;
export const onDemoMode = (fn: DemoListener) => {
  demoListeners.add(fn);
  fn(demoMode);
  return () => {
    demoListeners.delete(fn);
  };
};
const setDemoMode = (v: boolean) => {
  if (demoMode === v) return;
  demoMode = v;
  demoListeners.forEach((fn) => fn(v));
};

const realAdapter = axios.getAdapter("xhr");

const api = axios.create({ baseURL: API_BASE, timeout: 2500 });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  if (demoMode) return handleMock(config);
  try {
    return await realAdapter(config);
  } catch (err) {
    // A response means the backend IS up (e.g. 401/404/500) — propagate.
    if (err instanceof AxiosError && err.response) throw err;
    setDemoMode(true);
    return handleMock(config);
  }
};

export default api;
