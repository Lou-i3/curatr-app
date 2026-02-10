'use client';

/**
 * Show Actions Menu - Dropdown menu for mobile to consolidate action buttons
 * Renders the scan and edit buttons inside a dropdown for compact mobile view
 */

import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShowScanButton } from './show-scan-button';
import { ShowEditButton } from './show-edit-button';

interface ShowActionsMenuProps {
  show: {
    id: number;
    title: string;
    folderName: string | null;
    year: number | null;
    monitorStatus: string;
    notes: string | null;
    description: string | null;
    posterPath: string | null;
    backdropPath: string | null;
  };
}

export function ShowActionsMenu({ show }: ShowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="p-1 space-y-1">
          <ShowScanButton
            show={{
              id: show.id,
              title: show.title,
              folderName: show.folderName,
            }}
          />
          <ShowEditButton show={show} />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
