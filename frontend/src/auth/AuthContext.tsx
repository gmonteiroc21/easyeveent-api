import { useCallback, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/authApi";
import { AuthContext, type AuthState } from "./auth-context";
import { tokenStorage } from "./tokenStorage";

export function AuthProvider({ children }: { children: ReactNode }) {
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
