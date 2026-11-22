import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type RegisterInput } from '../api';
import { setUnauthorizedHandler, tokenStore } from '../api/client';
import type { ProviderProfile, Role, Session, User } from '../types';

interface AuthState {
  user: User | null;
  providerProfile: ProviderProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  setSession: (session: Session) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const homePathFor = (role: Role) => ({ customer: '/customer', provider: '/provider', admin: '/admin' })[role];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((session: Session) => {
    if (session.token) tokenStore.set(session.token);
    setUser(session.user);
    setProviderProfile(session.providerProfile);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setProviderProfile(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      setSession(await authApi.me());
    } catch {
      logout();
    }
  }, [logout, setSession]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    refresh().finally(() => setLoading(false));
  }, [logout, refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login(email, password);
      setSession(session);
      return session.user;
    },
    [setSession]
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const session = await authApi.register(input);
      setSession(session);
      return session.user;
    },
    [setSession]
  );

  const value = useMemo(
    () => ({ user, providerProfile, loading, login, register, logout, refresh, setSession }),
    [user, providerProfile, loading, login, register, logout, refresh, setSession]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
