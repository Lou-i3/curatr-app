'use client';

/**
 * Analyze Media Button
 * Triggers FFprobe analysis for a single file
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileSearch, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AnalyzeMediaButtonProps {
  fileId: number;
  filename: string;
  /** Whether the file has been analyzed before */
  hasExistingData: boolean;
  /** Whether FFprobe is available/configured */
  ffprobeAvailable: boolean;
  /** Optional callback after successful analysis */
  onComplete?: () => void;
}

export function AnalyzeMediaButton({
  fileId,
  filename,
  hasExistingData,
  ffprobeAvailable,
  onComplete,
}: AnalyzeMediaButtonProps) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    const toastId = toast.loading(`Analyzing ${filename}...`);

    try {
      const response = await fetch(`/api/files/${fileId}/analyze`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      if (data.status === 'completed') {
        toast.success('Analysis complete', {
          id: toastId,
          description: `Found ${data.trackCount} tracks`,
        });
      } else if (data.status === 'pending') {
        toast.info('Analysis queued', {
          id: toastId,
          description: 'Task will run when a slot is available',
        });
      }

      // Refresh the page to show updated data
      router.refresh();
      onComplete?.();
    } catch (error) {
      toast.error('Analysis failed', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // If FFprobe is not available, show disabled button with tooltip
  if (!ffprobeAvailable) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="sm" disabled>
                <FileSearch className="size-4 mr-2" />
                Analyze
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>FFprobe not configured. Set FFPROBE_PATH environment variable.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAnalyze}
      disabled={analyzing}
    >
      {analyzing ? (
        <Loader2 className="size-4 mr-2 animate-spin" />
      ) : hasExistingData ? (
        <RefreshCw className="size-4 mr-2" />
      ) : (
        <FileSearch className="size-4 mr-2" />
      )}
      {analyzing ? 'Analyzing...' : hasExistingData ? 'Re-analyze' : 'Analyze'}
    </Button>
  );
}
