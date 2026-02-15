'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Table as TableInstance } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { TVShowDialog } from './show-dialog';
import { ColumnVisibilityToggle } from '@/components/column-visibility-toggle';
import { ViewToggle } from '@/components/view-toggle';
import type { TVShow } from './tv-show-columns';

const MONITOR_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'WANTED', label: 'Wanted' },
  { value: 'UNWANTED', label: 'Unwanted' },
];

interface TVShowsToolbarProps {
  table: TableInstance<TVShow> | null;
}

export function TVShowsToolbar({ table = null }: TVShowsToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get('q') ?? '';
  const currentMonitorStatus = searchParams.get('monitor') ?? 'all';
  const currentView = searchParams.get('view') ?? 'grid';

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateParams('q', e.target.value);
  };

  const handleMonitorStatusChange = (value: string) => {
    updateParams('monitor', value);
  };

  const handleViewChange = (view: string) => {
    updateParams('view', view);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search shows..."
          defaultValue={currentSearch}
          onChange={handleSearchChange}
          className={`pl-10 ${isPending ? 'opacity-50' : ''}`}
        />
      </div>

      {/* Monitor Status Filter */}
      <Select value={currentMonitorStatus} onValueChange={handleMonitorStatusChange}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Monitor" />
        </SelectTrigger>
        <SelectContent>
          {MONITOR_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Column Visibility Toggle (only in table view) */}
      <ColumnVisibilityToggle table={table} />

      {/* View Toggle */}
      <ViewToggle
        isTableView={currentView === 'table'}
        onViewChange={(view) => handleViewChange(view)}
      />

      {/* Add Button */}
      <TVShowDialog trigger="add" />
    </div>
  );
}
