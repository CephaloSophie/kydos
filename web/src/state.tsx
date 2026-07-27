import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from './models/User.model';
import { apiService } from './services/ApiService';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    apiService.fetch('/auth/me').then((data) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const login = async (username: string, password: string) => {
    const data = await apiService.fetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const register = async (username: string, password: string, email?: string) => {
    const data = await apiService.fetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, email }) });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
export type { User };
