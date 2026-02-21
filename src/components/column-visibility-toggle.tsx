'use client';

/**
 * Column Visibility Toggle - Dropdown to show/hide table columns
 * Integrates with TanStack Table's column visibility state
 */

import { useState, useEffect } from 'react';
import { Table } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnVisibilityToggleProps<TData> {
  table: Table<TData> | null;
}

export function ColumnVisibilityToggle<TData>({
  table,
}: ColumnVisibilityToggleProps<TData>) {
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!table) return;

    const visibility: Record<string, boolean> = {};
    table.getAllColumns().forEach((column) => {
      visibility[column.id] = column.getIsVisible();
    });
    setColumnVisibility(visibility);
  }, [table]);

  if (!table) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={columnVisibility[column.id] ?? true}
              onCheckedChange={(checked) => {
                setColumnVisibility((prev) => ({
                  ...prev,
                  [column.id]: !!checked,
                }));
                column.toggleVisibility(!!checked);
              }}
            >
              {(column.columnDef.meta as { displayName?: string })?.displayName ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
