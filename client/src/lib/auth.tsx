import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiRequest, setAuthToken, getAuthToken } from "./queryClient";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => void;
  isOrganizer: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to restore session on mount
  useEffect(() => {
    async function restore() {
      const existing = getAuthToken();
      if (existing) {
        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${existing}` },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setToken(existing);
          } else {
            setAuthToken(null);
          }
        } catch {
          setAuthToken(null);
        }
      }
      setIsLoading(false);
    }
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role = "viewer") => {
    const res = await apiRequest("POST", "/api/auth/register", { email, password, name, role });
    const data = await res.json();
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isOrganizer: user?.role === "organizer",
        isStaff: user?.role === "staff" || user?.role === "organizer",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
