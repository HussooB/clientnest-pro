import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import api, { getToken, setToken } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getToken()) {
        setInitializing(false);
        return;
      }
      try {
        // ✅ Correctly unwrap the { success, data } envelope
        const response = await api.get<{ success: boolean; data: { user: User } }>("/auth/me");
        if (response.data.success && response.data.data) {
          if (alive) setUser(response.data.data.user);
        } else {
          setToken(null);
        }
      } catch {
        setToken(null);
      } finally {
        if (alive) setInitializing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // ✅ Correctly unwrap the { success, data } envelope
    const response = await api.post<{ 
      success: boolean; 
      data: { token: string; user: User }; 
      message?: string 
    }>("/auth/login", { email, password });
    
    if (response.data.success && response.data.data) {
      setToken(response.data.data.token);
      setUser(response.data.data.user);
      return response.data.data.user;
    } else {
      throw new Error(response.data.message || "Login failed");
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}