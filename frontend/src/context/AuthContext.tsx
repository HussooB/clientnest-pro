import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import api, { getToken, setToken } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  isLoading: boolean; // ✅ Exposed to prevent flash of login
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    ;(async () => {
      const token = getToken();
      if (!token) {
        if (alive) setIsLoading(false);
        return;
      }
      try {
        const response = await api.get<{ success: boolean; data: { user: User } }>("/auth/me");
        if (alive && response.data?.success && response.data?.data) {
          setUser(response.data.data.user);
        }
      } catch {
        // If /auth/me fails, don't clear the token — let the API interceptor handle 401.
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ success: boolean; data: { token: string; user: User }; message?: string }>("/auth/login", { email, password });
      if (response.data.success && response.data.data) {
        setToken(response.data.data.token);
        setUser(response.data.data.user);
        return response.data.data.user;
      }
      throw new Error(response.data.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}