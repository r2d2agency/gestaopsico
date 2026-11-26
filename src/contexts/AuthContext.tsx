import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { authApi } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  crp?: string;
  phone?: string;
  specialty?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; planId?: string }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("auth_token") || localStorage.getItem("token")
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const assistedToken = sessionStorage.getItem("assisted_access_token");
    if (params.get("assisted_access") === "1" && assistedToken) {
      localStorage.setItem("auth_token", assistedToken);
      sessionStorage.removeItem("assisted_access_token");
      window.history.replaceState({}, document.title, window.location.pathname);
      setToken(assistedToken);
    }
  }, []);

  useEffect(() => {
    if (token) {
      let active = true;
      setIsLoading(true);
      authApi.me().then((me) => {
        if (!active) return;
        setUser((current) => current && current.id === me.id ? { ...current, ...me } : me);
      }).catch(() => {
        if (!active) return;
        // Só limpa o token se não há usuário confirmado pelo login/registro.
        setUser((current) => {
          if (!current) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("token");
            setToken(null);
          }
          return current;
        });
      }).finally(() => {
        if (active) setIsLoading(false);
      });
      return () => { active = false; };
    }
    setIsLoading(false);
  }, [token]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await authApi.login(email, password);
    localStorage.setItem("auth_token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user as User;
  };

  const register = async (data: { name: string; email: string; password: string; planId?: string }): Promise<User> => {
    const res = await authApi.register(data) as { token: string; user: User };
    localStorage.setItem("auth_token", res.token);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    authApi.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
