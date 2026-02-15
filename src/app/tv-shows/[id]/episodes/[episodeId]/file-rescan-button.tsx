'use client';

/**
 * File Rescan Button — Re-checks file existence and metadata on disk
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/lib/contexts/auth-context';

interface FileRescanButtonProps {
  fileId: number;
}

export function FileRescanButton({ fileId }: FileRescanButtonProps) {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [rescanning, setRescanning] = useState(false);

  if (!isAdmin) return null;

  const handleRescan = async () => {
    setRescanning(true);
    try {
      const response = await fetch(`/api/files/${fileId}/rescan`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Rescan failed');
      }

      if (data.fileExists) {
        toast.success('File verified on disk');
      } else {
        toast.warning('File not found on disk');
      }

      router.refresh();
    } catch (error) {
      toast.error('Rescan failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRescanning(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleRescan}
            disabled={rescanning}
          >
            {rescanning ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Re-check file on disk</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
