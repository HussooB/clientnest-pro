import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import api, { getToken, setToken } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  loggingIn: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let alive = true;
    ;(async () => {
      const token = getToken();
      if (!token) {
        if (alive) setInitializing(false);
        return;
      }
      try {
        const response = await api.get<{ success: boolean; data: { user: User } }>("/auth/me");
        if (alive && response.data?.success && response.data?.data) {
          setUser(response.data.data.user);
        }
      } catch {
        // If /auth/me fails, don't clear the token — let the
        // API response interceptor handle 401 redirects. Just
        // mark initializing as complete so the UI proceeds.
      } finally {
        if (alive) setInitializing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setInitializing(true);
    try {
      const response = await api.post<{
        success: boolean;
        data: { token: string; user: User };
        message?: string;
      }>("/auth/login", { email, password });

      if (response.data.success && response.data.data) {
        setToken(response.data.data.token);
        setUser(response.data.data.user);
        return response.data.data.user;
      }
      throw new Error(response.data.message || "Login failed");
    } catch (err) {
      throw err;
    } finally {
      setInitializing(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}