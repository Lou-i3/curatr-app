'use client';

/**
 * Files Toolbar — Search, filter, column visibility, and view toggle
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ColumnVisibilityToggle } from '@/components/column-visibility-toggle';
import { ViewToggle } from '@/components/view-toggle';
import { getFileQualityVariant, getActionVariant } from '@/lib/status';
import type { FileQuality, Action } from '@/generated/prisma/client';
import type { FileRow } from './file-columns';

const QUALITY_OPTIONS = [
  { value: 'all', label: 'All Qualities' },
  { value: 'UNVERIFIED', label: 'Unverified' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'OK', label: 'OK' },
  { value: 'BROKEN', label: 'Broken' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'NOTHING', label: 'None' },
  { value: 'REDOWNLOAD', label: 'Redownload' },
  { value: 'CONVERT', label: 'Convert' },
  { value: 'ORGANIZE', label: 'Organize' },
  { value: 'REPAIR', label: 'Repair' },
];

const FILE_EXISTS_OPTIONS = [
  { value: 'all', label: 'All Files' },
  { value: 'true', label: 'On Disk' },
  { value: 'false', label: 'Missing' },
];

const ANALYZED_OPTIONS = [
  { value: 'all', label: 'Analyzed: All' },
  { value: 'yes', label: 'Analyzed' },
  { value: 'no', label: 'Not Analyzed' },
];

interface FilesToolbarProps {
  table: TableInstance<FileRow> | null;
}

export function FilesToolbar({ table = null }: FilesToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get('q') ?? '';
  const currentQuality = searchParams.get('quality') ?? 'all';
  const currentAction = searchParams.get('action') ?? 'all';
  const currentFileExists = searchParams.get('fileExists') ?? 'all';
  const currentAnalyzed = searchParams.get('analyzed') ?? 'all';
  const currentView = searchParams.get('view') ?? 'cards';

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
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search files..."
          defaultValue={currentSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={`pl-10 ${isPending ? 'opacity-50' : ''}`}
        />
      </div>

      {/* Quality Filter */}
      <Select value={currentQuality} onValueChange={(v) => updateParams('quality', v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Qualities" />
        </SelectTrigger>
        <SelectContent>
          {QUALITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                {opt.value !== 'all' && (
                  <Badge
                    variant={getFileQualityVariant(opt.value as FileQuality)}
                    className="size-2 p-0 rounded-full"
                  />
                )}
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Action Filter */}
      <Select value={currentAction} onValueChange={(v) => updateParams('action', v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Actions" />
        </SelectTrigger>
        <SelectContent>
          {ACTION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                {opt.value !== 'all' && (
                  <Badge
                    variant={getActionVariant(opt.value as Action)}
                    className="size-2 p-0 rounded-full"
                  />
                )}
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* File Existence Filter */}
      <Select value={currentFileExists} onValueChange={(v) => updateParams('fileExists', v)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="On Disk" />
        </SelectTrigger>
        <SelectContent>
          {FILE_EXISTS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Analyzed Filter */}
      <Select value={currentAnalyzed} onValueChange={(v) => updateParams('analyzed', v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Analyzed" />
        </SelectTrigger>
        <SelectContent>
          {ANALYZED_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Column Visibility Toggle (only in table view) */}
      <ColumnVisibilityToggle table={table} />

      {/* View Toggle */}
      <ViewToggle
        isTableView={currentView === 'table'}
        onViewChange={(view) => updateParams('view', view)}
      />
    </div>
  );
}
