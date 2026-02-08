'use client';

/**
 * Playback Test Dialog
 *
 * Dialog for managing playback tests for files in an episode.
 * Shows existing tests grouped by file, allows adding new tests.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PlayCircle, Plus, Loader2, Trash2, Pencil, Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  PLAYBACK_STATUS_LABELS,
  PLAYBACK_STATUS_OPTIONS,
  getPlaybackStatusVariant,
} from '@/lib/status';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import type { PlaybackStatus } from '@/generated/prisma/client';

interface Platform {
  id: number;
  name: string;
  isRequired: boolean;
}

interface PlaybackTest {
  id: number;
  platformId: number;
  platform: Platform;
  status: PlaybackStatus;
  notes: string | null;
  testedAt: string;
}

interface EpisodeFile {
  id: number;
  filename: string;
  playbackTests: PlaybackTest[];
}

interface PlaybackTestDialogProps {
  episodeId: number;
  episodeTitle?: string | null;
  seasonEpisode: string; // e.g., "S01E05"
  files?: EpisodeFile[]; // Optional - will fetch if not provided
  trigger?: React.ReactNode;
}

export function PlaybackTestDialog({
  episodeId,
  episodeTitle,
  seasonEpisode,
  files: initialFiles,
  trigger,
}: PlaybackTestDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [files, setFiles] = useState<EpisodeFile[]>(initialFiles || []);
  const [loading, setLoading] = useState(false);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');

  // Add test state
  const [addingToFileId, setAddingToFileId] = useState<number | null>(null);
  const [newTestPlatformId, setNewTestPlatformId] = useState<string>('');
  const [newTestStatus, setNewTestStatus] = useState<PlaybackStatus>('PASS');
  const [newTestNotes, setNewTestNotes] = useState('');
  const [newTestDate, setNewTestDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit test state
  const [editingTestId, setEditingTestId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<PlaybackStatus>('PASS');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');

  // Delete confirmation state
  const [deleteTestId, setDeleteTestId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  };

  // Format date for display using app settings
  const formatTestDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return formatDateTimeWithFormat(date, dateFormat);
  };

  // Get current datetime for default value
  const getCurrentDateTime = () => {
    return new Date().toISOString().slice(0, 16);
  };

  // Refetch files only (used after mutations)
  const refetchFiles = useCallback(async () => {
    try {
      const response = await fetch(`/api/episodes/${episodeId}/files`);
      if (response.ok) {
        const filesData = await response.json();
        setFiles(filesData);
      }
    } catch {
      // Silent fail - data will refresh on next open
    }
  }, [episodeId]);

  // Fetch data when dialog opens
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadingPlatforms(true);
    try {
      // Fetch platforms, files, and settings in parallel
      const [platformsRes, filesRes, settingsRes] = await Promise.all([
        fetch('/api/platforms'),
        !initialFiles ? fetch(`/api/episodes/${episodeId}/files`) : Promise.resolve(null),
        fetch('/api/settings'),
      ]);

      if (platformsRes.ok) {
        const platformsData = await platformsRes.json();
        setPlatforms(platformsData);
      }

      if (filesRes && filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setDateFormat(settingsData.dateFormat || 'EU');
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setLoadingPlatforms(false);
    }
  }, [episodeId, initialFiles]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // Start adding test to a file
  const handleStartAdd = (fileId: number) => {
    setAddingToFileId(fileId);
    setNewTestPlatformId('');
    setNewTestStatus('PASS');
    setNewTestNotes('');
    setNewTestDate(getCurrentDateTime());
  };

  // Cancel adding
  const handleCancelAdd = () => {
    setAddingToFileId(null);
    setNewTestPlatformId('');
    setNewTestStatus('PASS');
    setNewTestNotes('');
    setNewTestDate('');
  };

  // Save new test
  const handleSaveTest = async () => {
    if (!addingToFileId || !newTestPlatformId) return;

    setSaving(true);
    try {
      const response = await fetch('/api/playback-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeFileId: addingToFileId,
          platformId: parseInt(newTestPlatformId, 10),
          status: newTestStatus,
          notes: newTestNotes || null,
          testedAt: newTestDate ? new Date(newTestDate).toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add test');
      }

      toast.success('Playback test added');
      handleCancelAdd();
      await refetchFiles();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add test');
    } finally {
      setSaving(false);
    }
  };

  // Start editing test
  const handleStartEdit = (test: PlaybackTest) => {
    setEditingTestId(test.id);
    setEditStatus(test.status);
    setEditNotes(test.notes || '');
    setEditDate(toDateTimeLocal(test.testedAt));
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTestId(null);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingTestId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/playback-tests/${editingTestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes || null,
          testedAt: editDate ? new Date(editDate).toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update test');
      }

      toast.success('Test updated');
      handleCancelEdit();
      await refetchFiles();
      router.refresh();
    } catch {
      toast.error('Failed to update test');
    } finally {
      setSaving(false);
    }
  };

  // Confirm and delete test
  const handleConfirmDelete = async () => {
    if (!deleteTestId) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/playback-tests/${deleteTestId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete test');
      }

      toast.success('Test deleted');
      await refetchFiles();
      router.refresh();
    } catch {
      toast.error('Failed to delete test');
    } finally {
      setDeleting(false);
      setDeleteTestId(null);
    }
  };

  // Get tested platform IDs for a file (to filter dropdown)
  const getTestedPlatformIds = (file: EpisodeFile): Set<number> => {
    return new Set(file.playbackTests.map((t) => t.platformId));
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <PlayCircle className="h-4 w-4" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="w-[75vw] max-w-[75vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Playback Tests</DialogTitle>
            <DialogDescription>
              {seasonEpisode} - {episodeTitle || 'Unknown Episode'}
            </DialogDescription>
          </DialogHeader>

          {loading || loadingPlatforms ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : platforms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No platforms configured.</p>
              <p className="text-sm mt-1">
                Add platforms in Settings to start recording playback tests.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {files.map((file, fileIndex) => {
                const testedPlatformIds = getTestedPlatformIds(file);
                const availablePlatforms = platforms.filter(
                  (p) => !testedPlatformIds.has(p.id)
                );

                return (
                  <div key={file.id} className="space-y-3">
                    {/* File header */}
                    <div className="font-medium text-sm break-words">
                      {file.filename}
                    </div>

                    {/* Existing tests as cards */}
                    {file.playbackTests.length > 0 && (
                      <div className="space-y-3">
                        {file.playbackTests.map((test) => (
                          <Card key={test.id} className="relative">
                            {editingTestId === test.id ? (
                              // Edit mode
                              <CardContent className="p-4 space-y-3">
                                <div className="font-medium flex items-center gap-2">
                                  {test.platform.name}
                                  {test.platform.isRequired && (
                                    <span className="text-destructive-foreground">*</span>
                                  )}
                                </div>
                                <Select
                                  value={editStatus}
                                  onValueChange={(v) => setEditStatus(v as PlaybackStatus)}
                                >
                                  <SelectTrigger className="h-8">
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
                                <Input
                                  type="datetime-local"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="h-8"
                                />
                                <Textarea
                                  placeholder="Notes (optional)"
                                  value={editNotes}
                                  onChange={(e) => setEditNotes(e.target.value)}
                                  className="min-h-[60px]"
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                  >
                                    {saving ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                      <Check className="h-4 w-4 mr-1" />
                                    )}
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </CardContent>
                            ) : (
                              // View mode - two line layout
                              <CardContent className="p-3 space-y-2">
                                {/* Line 1: Platform + Actions */}
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm">
                                    {test.platform.name}
                                    {test.platform.isRequired && (
                                      <span className="text-destructive-foreground ml-1">*</span>
                                    )}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => handleStartEdit(test)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive-foreground hover:text-destructive-foreground"
                                      onClick={() => setDeleteTestId(test.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                {/* Line 2: Status, Date, Notes */}
                                <div className="flex items-center gap-4">
                                  <Badge variant={getPlaybackStatusVariant(test.status)}>
                                    {PLAYBACK_STATUS_LABELS[test.status]}
                                  </Badge>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                                    <Calendar className="h-3 w-3" />
                                    {formatTestDate(test.testedAt)}
                                  </div>
                                  {test.notes && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground truncate flex-1 cursor-help">
                                          {test.notes}
                                        </p>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm">
                                        <p className="whitespace-pre-wrap">{test.notes}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Add test form */}
                    {addingToFileId === file.id ? (
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <Select
                              value={newTestPlatformId}
                              onValueChange={setNewTestPlatformId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Platform" />
                              </SelectTrigger>
                              <SelectContent>
                                {availablePlatforms.map((p) => (
                                  <SelectItem key={p.id} value={p.id.toString()}>
                                    {p.name}
                                    {p.isRequired && ' *'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={newTestStatus}
                              onValueChange={(v) => setNewTestStatus(v as PlaybackStatus)}
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
                            <Input
                              type="datetime-local"
                              value={newTestDate}
                              onChange={(e) => setNewTestDate(e.target.value)}
                            />
                          </div>
                          <Textarea
                            placeholder="Notes (optional)"
                            value={newTestNotes}
                            onChange={(e) => setNewTestNotes(e.target.value)}
                            className="min-h-[60px]"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveTest}
                              disabled={!newTestPlatformId || saving}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <Check className="h-4 w-4 mr-1" />
                              )}
                              Add Test
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelAdd}
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      availablePlatforms.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartAdd(file.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Test
                        </Button>
                      )
                    )}

                    {fileIndex < files.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteTestId !== null} onOpenChange={(open) => !open && setDeleteTestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playback Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this playback test? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
