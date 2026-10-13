import * as React from 'react';
import { apiClient, ApiClientError } from '../lib/api-client';
import { AuthenticatedPrincipal, CanonicalRole } from '../types/auth';

interface AuthContextValue {
  user: AuthenticatedPrincipal | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthenticatedPrincipal>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  }) => Promise<{ status: string; message: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthenticatedPrincipal | null>;
  hasRole: (role: CanonicalRole) => boolean;
  hasAnyRole: (roles: CanonicalRole[]) => boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const AUTH_HINT_KEY = 'pdschain_auth_active';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthenticatedPrincipal | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const refreshUser = React.useCallback(async (): Promise<AuthenticatedPrincipal | null> => {
    try {
      const res = await apiClient.getCurrentUser();
      setUser(res.user);
      setError(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_HINT_KEY, 'true');
      }
      return res.user;
    } catch {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_HINT_KEY);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const hasHint = typeof window !== 'undefined' && localStorage.getItem(AUTH_HINT_KEY) === 'true';
    if (hasHint) {
      void refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = React.useCallback(
    async (email: string, password: string): Promise<AuthenticatedPrincipal> => {
      setError(null);
      try {
        const res = await apiClient.login({ email, password });
        setUser(res.user);
        if (typeof window !== 'undefined') {
          localStorage.setItem(AUTH_HINT_KEY, 'true');
        }
        return res.user;
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : 'Authentication failed. Please check credentials.';
        setError(message);
        throw err;
      }
    },
    [],
  );

  const register = React.useCallback(
    async (payload: {
      fullName: string;
      email: string;
      password: string;
      confirmPassword: string;
      acceptTerms: boolean;
    }) => {
      setError(null);
      try {
        const res = await apiClient.registerCitizen(payload);
        return res;
      } catch (err) {
        const message =
          err instanceof ApiClientError ? err.message : 'Registration failed. Please check inputs.';
        setError(message);
        throw err;
      }
    },
    [],
  );

  const logout = React.useCallback(async (): Promise<void> => {
    try {
      await apiClient.logout();
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_HINT_KEY);
      }
      setUser(null);
      setError(null);
    }
  }, []);

  const hasRole = React.useCallback(
    (role: CanonicalRole): boolean => {
      return user ? user.roles.includes(role) : false;
    },
    [user],
  );

  const hasAnyRole = React.useCallback(
    (roles: CanonicalRole[]): boolean => {
      return user ? roles.some((r) => user.roles.includes(r)) : false;
    },
    [user],
  );

  const isAdmin = Boolean(user && user.roles.includes('ADMIN'));
  const isStaff = Boolean(
    user &&
    user.roles.some((r) =>
      ['ADMIN', 'FPS_OPERATOR', 'WAREHOUSE_MANAGER', 'DISTRICT_OFFICER'].includes(r),
    ),
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser,
      hasRole,
      hasAnyRole,
      isAdmin,
      isStaff,
    }),
    [
      user,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser,
      hasRole,
      hasAnyRole,
      isAdmin,
      isStaff,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
