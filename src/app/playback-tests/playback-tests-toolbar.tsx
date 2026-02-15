'use client';

/**
 * Playback Tests Toolbar — Search, status filter chips, platform filter, column visibility, view toggle
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition, useEffect, useState, useRef } from 'react';
import { Table as TableInstance } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { ColumnVisibilityToggle } from '@/components/column-visibility-toggle';
import { ViewToggle } from '@/components/view-toggle';
import {
  PLAYBACK_STATUS_LABELS,
  getPlaybackStatusVariant,
} from '@/lib/status';
import type { PlaybackStatus } from '@/generated/prisma/client';
import type { PlaybackTestRow } from './playback-test-columns';

type StatusFilter = PlaybackStatus | 'all';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'PASS', label: 'Pass' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'FAIL', label: 'Fail' },
];

interface Platform {
  id: number;
  name: string;
}

interface PlaybackTestsToolbarProps {
  table: TableInstance<PlaybackTestRow> | null;
  statusCounts: Record<string, number>;
  loading: boolean;
}

export function PlaybackTestsToolbar({
  table = null,
  statusCounts,
  loading,
}: PlaybackTestsToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get('q') ?? '';
  const currentStatus = (searchParams.get('status') ?? 'all') as StatusFilter;
  const currentPlatform = searchParams.get('platformId') ?? 'all';
  const currentView = searchParams.get('view') ?? 'cards';

  const [platforms, setPlatforms] = useState<Platform[]>([]);

  // Fetch platforms for filter
  useEffect(() => {
    fetch('/api/platforms')
      .then((r) => r.json())
      .then((data) => setPlatforms(data))
      .catch(() => {});
  }, []);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.replace(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams('q', value);
      }, 500);
    },
    [updateParams]
  );

  return (
    <div className="space-y-3">
      {/* Status Filter Chips */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2 flex-1 overflow-x-auto scrollbar-none md:flex-wrap">
          {STATUS_FILTERS.map((filter) => {
            const isActive = currentStatus === filter.value;
            const count = statusCounts[filter.value] ?? 0;
            const variant = filter.value !== 'all'
              ? getPlaybackStatusVariant(filter.value as PlaybackStatus)
              : undefined;

            return (
              <button
                key={filter.value}
                onClick={() => updateParams('status', filter.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {!isActive && variant && (
                  <Badge variant={variant} className="size-2 p-0 rounded-full" />
                )}
                {filter.label}
                {!loading && (
                  <span className={`text-xs ${isActive ? 'opacity-75' : 'opacity-50'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View Toggle */}
        <ViewToggle
          isTableView={currentView === 'table'}
          onViewChange={(view) => updateParams('view', view)}
        />
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by show or filename..."
            defaultValue={currentSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`pl-10 ${isPending ? 'opacity-50' : ''}`}
          />
        </div>

        {/* Platform Filter */}
        {platforms.length > 0 && (
          <Select value={currentPlatform} onValueChange={(v) => updateParams('platformId', v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Column Visibility Toggle (only in table view) */}
        <ColumnVisibilityToggle table={table} />
      </div>
    </div>
  );
}
