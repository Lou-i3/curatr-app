'use client';

/**
 * Auth Context - Provides authentication state to client components
 * Fetches session from /api/auth/session on mount
 * In no-auth mode: returns isAdmin=true for backwards compatibility
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

interface AuthUser {
  id: number;
  username: string;
  role: 'ADMIN' | 'USER';
  thumbUrl: string | null;
  email: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  authMode: 'none' | 'plex';
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<'none' | 'plex'>('none');
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();
      setAuthMode(data.authMode || 'none');

      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Redirect to login when plex auth is enabled but session is invalid
  // Handles stale cookies that bypass the proxy's cookie-existence check
  useEffect(() => {
    if (!loading && authMode === 'plex' && !user) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }, [loading, authMode, user]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/login';
    } catch {
      // Force redirect even on error
      window.location.href = '/login';
    }
  }, []);

  // While loading, default to admin=true to avoid hiding items during SSR/hydration
  // Once loaded, proper role checks apply
  const isAdmin = loading || authMode === 'none' || user?.role === 'ADMIN';
  const isAuthenticated = loading || authMode === 'none' || user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isAuthenticated,
        authMode,
        loading,
        refresh: fetchSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state in client components
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
