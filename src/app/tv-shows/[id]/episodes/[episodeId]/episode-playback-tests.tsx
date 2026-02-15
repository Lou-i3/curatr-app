'use client';

/**
 * Inline Playback Tests for Episode Detail Page
 * Shows tests with edit/delete buttons and a Plus button to add new tests.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Loader2, Check, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { EditTestDialog, type EditableTest } from '@/components/playback-tests/edit-test-dialog';
import { useAuth } from '@/lib/contexts/auth-context';

interface PlaybackTest {
  id: number;
  platformId: number;
  platform: { id: number; name: string; isRequired: boolean };
  status: PlaybackStatus;
  notes: string | null;
  testedAt: string;
}

interface Platform {
  id: number;
  name: string;
  isRequired: boolean;
}

interface EpisodePlaybackTestsProps {
  fileId: number;
  episodeId: number;
  tests: PlaybackTest[];
  dateFormat: DateFormat;
}

export function EpisodePlaybackTests({
  fileId,
  episodeId,
  tests,
  dateFormat,
}: EpisodePlaybackTestsProps) {
  const router = useRouter();
  const { isAdmin } = useAuth();

  // Platforms for add dialog
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformsLoaded, setPlatformsLoaded] = useState(false);

  // Add dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [newTestPlatformId, setNewTestPlatformId] = useState<string>('');
  const [newTestStatus, setNewTestStatus] = useState<PlaybackStatus>('PASS');
  const [newTestNotes, setNewTestNotes] = useState('');
  const [newTestDate, setNewTestDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingTest, setEditingTest] = useState<EditableTest | null>(null);

  // Delete state
  const [deleteTestId, setDeleteTestId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch platforms when add dialog opens
  useEffect(() => {
    if (addOpen && !platformsLoaded) {
      fetch('/api/platforms')
        .then((r) => r.json())
        .then((data) => {
          setPlatforms(data);
          setPlatformsLoaded(true);
        })
        .catch(() => {});
    }
  }, [addOpen, platformsLoaded]);

  // Reset add form
  const resetAddForm = useCallback(() => {
    setNewTestPlatformId('');
    setNewTestStatus('PASS');
    setNewTestNotes('');
    setNewTestDate(new Date().toISOString().slice(0, 16));
  }, []);

  const handleOpenAdd = () => {
    resetAddForm();
    setAddOpen(true);
  };

  // Save new test
  const handleSaveTest = async () => {
    if (!newTestPlatformId) return;

    setSaving(true);
    try {
      const response = await fetch('/api/playback-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeFileId: fileId,
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
      setAddOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add test');
    } finally {
      setSaving(false);
    }
  };

  // Edit
  const handleStartEdit = (test: PlaybackTest) => {
    setEditingTest({
      id: test.id,
      status: test.status,
      notes: test.notes,
      testedAt: test.testedAt,
      platformName: test.platform.name,
    });
  };

  const handleEditSaved = () => {
    setEditingTest(null);
    router.refresh();
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deleteTestId) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/playback-tests/${deleteTestId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete test');

      toast.success('Test deleted');
      router.refresh();
    } catch {
      toast.error('Failed to delete test');
    } finally {
      setDeleting(false);
      setDeleteTestId(null);
    }
  };

  // Available platforms (filter out already-tested ones)
  const testedPlatformIds = new Set(tests.map((t) => t.platformId));
  const availablePlatforms = platforms.filter((p) => !testedPlatformIds.has(p.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Playback Tests</h4>
        {isAdmin && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleOpenAdd}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add playback test</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {tests.length > 0 ? (
        <div className="space-y-2">
          {tests.map((test) => (
            <div key={test.id} className="border rounded-lg p-3 space-y-2">
              {/* Line 1: Platform + Actions */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{test.platform.name}</span>
                {isAdmin && (
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => handleStartEdit(test)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive-foreground"
                      onClick={() => setDeleteTestId(test.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {/* Line 2: Status, Date, Notes */}
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant={getPlaybackStatusVariant(test.status)}>
                  {PLAYBACK_STATUS_LABELS[test.status]}
                </Badge>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateTimeWithFormat(new Date(test.testedAt), dateFormat)}
                </div>
                {test.notes && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px] cursor-help">
                          {test.notes}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="whitespace-pre-wrap">{test.notes}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No playback tests recorded.</p>
      )}

      {/* Add Test Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Playback Test</DialogTitle>
            <DialogDescription>Record a new playback test for this file.</DialogDescription>
          </DialogHeader>
          {!platformsLoaded ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : availablePlatforms.length === 0 && platforms.length > 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              All platforms have been tested for this file.
            </p>
          ) : platforms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No platforms configured. Add platforms in Settings first.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Select value={newTestPlatformId} onValueChange={setNewTestPlatformId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlatforms.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}{p.isRequired ? ' *' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
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
              </div>
              <Input
                type="datetime-local"
                value={newTestDate}
                onChange={(e) => setNewTestDate(e.target.value)}
              />
              <Textarea
                placeholder="Notes (optional)"
                value={newTestNotes}
                onChange={(e) => setNewTestNotes(e.target.value)}
                className="min-h-[60px]"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTest} disabled={!newTestPlatformId || saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Add Test
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingTest && (
        <EditTestDialog
          test={editingTest}
          open={!!editingTest}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingTest(null);
          }}
          onSaved={handleEditSaved}
        />
      )}

      {/* Delete Confirmation */}
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
