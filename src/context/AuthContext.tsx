import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { clearToken, getToken } from "../services/api";
import * as authService from "../services/authService";
import type { ApiUser, AuthUser, Role } from "../types/auth";

export type { Role, AuthUser };

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const toAuthUser = (apiUser: ApiUser): AuthUser => ({
  id: apiUser.id,
  name: apiUser.name,
  email: apiUser.email,
  role: apiUser.role,
  employeeId: apiUser.employee?.id ?? null,
  avatar: apiUser.employee?.avatar ?? null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false);
      return;
    }

    authService
      .fetchCurrentUser()
      .then((apiUser) => setUser(toAuthUser(apiUser)))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    // Fired by apiRequest() whenever any authenticated call comes back 401
    // (expired/invalid token), so a stale session gets kicked back to /login
    // instead of surfacing a raw "Unauthenticated." error mid-session.
    const handleUnauthorized = () => setUser(null);

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () =>
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    const apiUser = await authService.login(email, password);
    const authUser = toAuthUser(apiUser);
    setUser(authUser);
    return authUser;
  };

  const logout = () => {
    setUser(null);
    void authService.logout();
  };

  const refreshUser = async () => {
    if (!getToken()) return;

    const apiUser = await authService.fetchCurrentUser();
    setUser(toAuthUser(apiUser));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return ctx;
};
