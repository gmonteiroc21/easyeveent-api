import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authApi } from "../api/authApi";
import { tokenStorage } from "./tokenStorage";

type AuthState = {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const { token } = await authApi.login({ identifier, password });
    tokenStorage.set(token);
    setToken(token);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ token, isAuthenticated: Boolean(token), login, logout }),
    [token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}