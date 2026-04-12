"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { userApi, authApi } from "./api";

interface User {
  id: string;
  email: string;
  display_name: string;
  timezone: string;
  plan: string;
  email_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await userApi.getProfile();
      setUser(res.data);
    } catch {
      setUser(null);
      localStorage.removeItem("access_token");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      refresh().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem("access_token", res.data.access_token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await authApi.logout();
    localStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}