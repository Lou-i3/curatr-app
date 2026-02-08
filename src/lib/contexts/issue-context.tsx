'use client';

/**
 * Issue Context - Provides issue counts for sidebar badge
 * Lightweight polling to keep the active issue count up to date
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';

interface IssueCounts {
  active: number;
  total: number;
}

interface IssueContextValue {
  counts: IssueCounts;
  refresh: () => Promise<void>;
}

const IssueContext = createContext<IssueContextValue | null>(null);

export function IssueProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<IssueCounts>({ active: 0, total: 0 });
  const { isAuthenticated, loading: authLoading } = useAuth();

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/issues/counts');
      if (!response.ok) return;
      const data = await response.json();
      setCounts({ active: data.active || 0, total: data.total || 0 });
    } catch {
      // Silently fail — will retry on next poll
    }
  }, []);

  useEffect(() => {
    // Don't poll until auth state is resolved and user is authenticated
    if (authLoading || !isAuthenticated) return;

    fetchCounts();
    const intervalId = setInterval(fetchCounts, 30000);
    return () => clearInterval(intervalId);
  }, [fetchCounts, authLoading, isAuthenticated]);

  const refresh = useCallback(async () => {
    await fetchCounts();
  }, [fetchCounts]);

  return (
    <IssueContext.Provider value={{ counts, refresh }}>
      {children}
    </IssueContext.Provider>
  );
}

/**
 * Hook for issue counts (sidebar badge use case)
 */
export function useIssueCounts(): IssueCounts {
  const context = useContext(IssueContext);
  if (!context) {
    throw new Error('useIssueCounts must be used within an IssueProvider');
  }
  return context.counts;
}

/**
 * Hook for full issue context (page use case — includes refresh)
 */
export function useIssueContext(): IssueContextValue {
  const context = useContext(IssueContext);
  if (!context) {
    throw new Error('useIssueContext must be used within an IssueProvider');
  }
  return context;
}
