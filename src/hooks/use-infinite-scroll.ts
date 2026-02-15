/**
 * useInfiniteScroll - Shared hook for offset-based infinite scroll pagination.
 * Manages item accumulation, IntersectionObserver sentinel, and loading states.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions<T> {
  /** Base API URL without query params (e.g., '/api/files') */
  apiUrl: string;
  /** Serialized query string from filters (e.g., 'quality=OK&q=test') */
  apiQuery: string;
  /** Number of items per page (default 200) */
  limit?: number;
  /** Transform response JSON into { data, total, meta? } */
  parseResponse: (json: Record<string, unknown>) => {
    data: T[];
    total: number;
    meta?: Record<string, unknown>;
  };
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** Extra metadata from parseResponse (e.g., status counts) */
  meta: Record<string, unknown> | null;
  /** Force a full refetch from offset 0 (shows loading skeleton) */
  refetch: () => void;
  /** Silently refresh data without showing loading state */
  refresh: () => void;
}

const DEFAULT_LIMIT = 200;

export function useInfiniteScroll<T>({
  apiUrl,
  apiQuery,
  limit = DEFAULT_LIMIT,
  parseResponse,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const hasMore = items.length < total;

  // Build the full URL with limit/offset
  const buildUrl = useCallback(
    (currentOffset: number) => {
      const sep = apiQuery ? '&' : '';
      return `${apiUrl}?${apiQuery}${sep}limit=${limit}&offset=${currentOffset}`;
    },
    [apiUrl, apiQuery, limit]
  );

  // Fetch a page of data
  const fetchPage = useCallback(
    async (currentOffset: number, isInitial: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      try {
        const response = await fetch(buildUrl(currentOffset), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Fetch failed');
        const json = await response.json();
        const { data, total: newTotal, meta: newMeta } = parseResponse(json);

        if (isInitial) {
          setItems(data);
        } else {
          setItems((prev) => [...prev, ...data]);
        }
        setTotal(newTotal);
        if (newMeta !== undefined) setMeta(newMeta);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Let the page handle errors via empty items + loading=false
        }
      } finally {
        // Only clear loading if this request wasn't aborted —
        // an aborted request means a new one is already in flight
        if (!controller.signal.aborted) {
          if (isInitial) setLoading(false);
          else setLoadingMore(false);
        }
      }
    },
    [buildUrl, parseResponse]
  );

  // Fetch from offset 0 when apiQuery changes
  // Keep existing items visible until new data arrives to avoid empty flashes
  useEffect(() => {
    setLoading(true);
    fetchPage(0, true);

    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiQuery]);

  // Load more function
  const loadMore = useCallback(() => {
    if (loadingMore || loading) return;
    const currentLength = itemsRef.current.length;
    if (currentLength >= total) return;
    fetchPage(currentLength, false);
  }, [loadingMore, loading, total, fetchPage]);

  // IntersectionObserver on sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Refetch from scratch — shows loading skeleton
  const refetch = useCallback(() => {
    setLoading(true);
    fetchPage(0, true);
  }, [fetchPage]);

  // Silently refresh data without loading state (for post-action updates)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(buildUrl(0));
      if (!response.ok) return;
      const json = await response.json();
      const { data, total: newTotal, meta: newMeta } = parseResponse(json);
      setItems(data);
      setTotal(newTotal);
      if (newMeta !== undefined) setMeta(newMeta);
    } catch {
      // Silent fail — old data stays visible
    }
  }, [buildUrl, parseResponse]);

  return {
    items,
    setItems,
    total,
    loading,
    loadingMore,
    hasMore,
    sentinelRef,
    meta,
    refetch,
    refresh,
  };
}
