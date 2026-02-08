'use client';

/**
 * TV Shows Table - Client component for displaying TV shows in a sortable table
 * Uses TanStack Table for sorting and column management
 */

import { useState, useEffect } from 'react';
import { Table as TableInstance } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { tvShowColumns, type TVShow } from './tv-show-columns';
import { Card, CardContent } from '@/components/ui/card';

interface TVShowsTableProps {
  shows: TVShow[];
  onTableReady?: (table: TableInstance<TVShow>) => void;
}

export function TVShowsTable({ shows, onTableReady }: TVShowsTableProps) {
  const [table, setTable] = useState<TableInstance<TVShow> | null>(null);

  useEffect(() => {
    if (table && onTableReady) {
      onTableReady(table);
    }
  }, [table, onTableReady]);

  return (
    <Card className='p-0'>
      <CardContent className='p-2'>
        <DataTable
          columns={tvShowColumns}
          data={shows}
          onTableReady={setTable}
        />
      </CardContent>
    </Card>
  );
}
