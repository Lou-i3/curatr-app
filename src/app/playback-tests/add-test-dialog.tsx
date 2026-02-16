'use client';

/**
 * Add Playback Test Dialog — two-step dialog
 * Step 1: Search for a file by filename or show title
 * Step 2: Select platform, status, notes, date → submit
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PLAYBACK_STATUS_OPTIONS } from '@/lib/status';
import type { PlaybackStatus } from '@/generated/prisma/client';

interface FileResult {
  id: number;
  filename: string;
  episode: {
    id: number;
    episodeNumber: number;
    title: string | null;
    season: {
      seasonNumber: number;
      tvShow: { id: number; title: string };
    };
  };
}

interface Platform {
  id: number;
  name: string;
  isRequired: boolean;
}

interface AddTestDialogProps {
  onAdded?: () => void;
}

export function AddTestDialog({ onAdded }: AddTestDialogProps) {
  const [open, setOpen] = useState(false);

  // Step 1 state
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<FileResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileResult | null>(null);

  // Step 2 state
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [platformId, setPlatformId] = useState<string>('');
  const [status, setStatus] = useState<PlaybackStatus>('PASS');
  const [notes, setNotes] = useState('');
  const [testedAt, setTestedAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Get current datetime for default value
  const getCurrentDateTime = () => new Date().toISOString().slice(0, 16);

  const reset = useCallback(() => {
    setQuery('');
    setFiles([]);
    setSelectedFile(null);
    setPlatformId('');
    setStatus('PASS');
    setNotes('');
    setTestedAt('');
  }, []);

  // Fetch platforms when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingPlatforms(true);
    fetch('/api/platforms')
      .then((r) => r.json())
      .then((data) => setPlatforms(data))
      .catch(() => toast.error('Failed to load platforms'))
      .finally(() => setLoadingPlatforms(false));
  }, [open]);

  // Search files
  const searchFiles = useCallback(async (q: string) => {
    if (q.length < 2) {
      setFiles([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/files?q=${encodeURIComponent(q)}&limit=20`);
      if (!response.ok) throw new Error('Search failed');
      const json = await response.json();
      setFiles(json.data ?? []);
    } catch {
      // Silently fail
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelectFile = (file: FileResult) => {
    setSelectedFile(file);
    setTestedAt(getCurrentDateTime());
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedFile || !platformId) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/playback-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeFileId: selectedFile.id,
          platformId: parseInt(platformId, 10),
          status,
          notes: notes.trim() || null,
          testedAt: testedAt ? new Date(testedAt).toISOString() : undefined,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add test');
      }
      toast.success('Playback test added');
      setOpen(false);
      reset();
      onAdded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add test');
    } finally {
      setSubmitting(false);
    }
  }, [selectedFile, platformId, status, notes, testedAt, reset, onAdded]);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Plus className="size-4" />
          Add Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Playback Test</DialogTitle>
          <DialogDescription>
            {selectedFile
              ? `${selectedFile.episode.season.tvShow.title} — ${selectedFile.filename}`
              : 'Search for a file to test'}
          </DialogDescription>
        </DialogHeader>

        {!selectedFile ? (
          /* Step 1: File search */
          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename or show title..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  searchFiles(e.target.value);
                }}
                className="pl-9"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {files.length > 0 && (
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {files.map((file) => {
                  const ep = file.episode;
                  const epLabel = `S${String(ep.season.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
                  return (
                    <button
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      className="w-full flex flex-col gap-0.5 px-3 py-2 rounded-md hover:bg-accent text-left text-sm"
                    >
                      <span className="font-medium truncate">{file.filename}</span>
                      <span className="text-xs text-muted-foreground">
                        {ep.season.tvShow.title} — {epLabel}{ep.title ? ` — ${ep.title}` : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {query.length >= 2 && !searching && files.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No files found</p>
            )}
          </div>
        ) : (
          /* Step 2: Test details */
          <div className="space-y-4 py-2">
            <button
              onClick={() => setSelectedFile(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Change file
            </button>

            {loadingPlatforms ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : platforms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No platforms configured. Add platforms in Settings first.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={platformId} onValueChange={setPlatformId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}{p.isRequired ? ' *' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as PlaybackStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYBACK_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  type="datetime-local"
                  value={testedAt}
                  onChange={(e) => setTestedAt(e.target.value)}
                />

                <Textarea
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px]"
                />

                <Button
                  onClick={handleSubmit}
                  disabled={!platformId || submitting}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin mr-1" />
                  ) : (
                    <Check className="size-4 mr-1" />
                  )}
                  Add Test
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
