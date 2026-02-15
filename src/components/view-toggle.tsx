'use client';

/**
 * Shared view toggle component for switching between card and table views
 * Used across TV Shows, Issues, Files, and Playback Tests pages
 */

import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViewToggleProps {
  isTableView: boolean;
  onViewChange: (view: 'cards' | 'table') => void;
}

export function ViewToggle({ isTableView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex border rounded-md flex-shrink-0">
      <Button
        variant={!isTableView ? 'secondary' : 'ghost'}
        size="icon"
        className="rounded-r-none"
        onClick={() => onViewChange('cards')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={isTableView ? 'secondary' : 'ghost'}
        size="icon"
        className="rounded-l-none"
        onClick={() => onViewChange('table')}
      >
        <TableIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
