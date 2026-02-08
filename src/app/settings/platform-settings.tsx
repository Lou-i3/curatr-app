'use client';

/**
 * Platform Settings Component
 *
 * Manages playback test platforms (TV, Web Player, Mobile, etc.)
 * Allows adding, editing, deleting, and marking platforms as required.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { toast } from 'sonner';

interface Platform {
  id: number;
  name: string;
  isRequired: boolean;
  sortOrder: number;
  _count?: {
    playbackTests: number;
  };
}

export function PlatformSettings() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add new platform state
  const [newPlatformName, setNewPlatformName] = useState('');
  const [addingPlatform, setAddingPlatform] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  // Delete confirmation state
  const [deletingPlatform, setDeletingPlatform] = useState<Platform | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch platforms
  const fetchPlatforms = useCallback(async () => {
    try {
      const response = await fetch('/api/platforms');
      if (!response.ok) throw new Error('Failed to fetch platforms');
      const data = await response.json();
      setPlatforms(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load platforms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  // Add platform
  const handleAddPlatform = async () => {
    if (!newPlatformName.trim()) return;

    setAddingPlatform(true);
    try {
      const response = await fetch('/api/platforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlatformName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add platform');
      }

      const newPlatform = await response.json();
      setPlatforms((prev) => [...prev, newPlatform]);
      setNewPlatformName('');
      toast.success(`Platform "${newPlatform.name}" added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add platform');
    } finally {
      setAddingPlatform(false);
    }
  };

  // Toggle required status
  const handleToggleRequired = async (platform: Platform) => {
    const newRequired = !platform.isRequired;

    // Optimistic update
    setPlatforms((prev) =>
      prev.map((p) => (p.id === platform.id ? { ...p, isRequired: newRequired } : p))
    );

    try {
      const response = await fetch(`/api/platforms/${platform.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRequired: newRequired }),
      });

      if (!response.ok) {
        // Revert on error
        setPlatforms((prev) =>
          prev.map((p) => (p.id === platform.id ? { ...p, isRequired: !newRequired } : p))
        );
        throw new Error('Failed to update platform');
      }

      toast.success(
        newRequired
          ? `"${platform.name}" is now required`
          : `"${platform.name}" is no longer required`
      );
    } catch {
      toast.error('Failed to update platform');
    }
  };

  // Start editing
  const handleStartEdit = (platform: Platform) => {
    setEditingId(platform.id);
    setEditingName(platform.name);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  // Save edit
  const handleSaveEdit = async (platformId: number) => {
    if (!editingName.trim()) {
      handleCancelEdit();
      return;
    }

    const originalPlatform = platforms.find((p) => p.id === platformId);
    if (!originalPlatform || originalPlatform.name === editingName.trim()) {
      handleCancelEdit();
      return;
    }

    // Optimistic update
    setPlatforms((prev) =>
      prev.map((p) => (p.id === platformId ? { ...p, name: editingName.trim() } : p))
    );
    handleCancelEdit();

    try {
      const response = await fetch(`/api/platforms/${platformId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (!response.ok) {
        // Revert on error
        setPlatforms((prev) =>
          prev.map((p) => (p.id === platformId ? { ...p, name: originalPlatform.name } : p))
        );
        const data = await response.json();
        throw new Error(data.error || 'Failed to update platform');
      }

      toast.success('Platform updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update platform');
    }
  };

  // Confirm and delete platform
  const handleConfirmDelete = async () => {
    if (!deletingPlatform) return;

    if (deletingPlatform._count && deletingPlatform._count.playbackTests > 0) {
      toast.error(
        `Cannot delete "${deletingPlatform.name}" - it has ${deletingPlatform._count.playbackTests} test(s)`
      );
      setDeletingPlatform(null);
      return;
    }

    setDeleting(true);
    const platformName = deletingPlatform.name;

    // Optimistic update
    setPlatforms((prev) => prev.filter((p) => p.id !== deletingPlatform.id));

    try {
      const response = await fetch(`/api/platforms/${deletingPlatform.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert on error
        fetchPlatforms();
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete platform');
      }

      toast.success(`Platform "${platformName}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete platform');
    } finally {
      setDeleting(false);
      setDeletingPlatform(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive-foreground text-sm py-4">
        {error}
        <Button variant="link" size="sm" onClick={fetchPlatforms} className="ml-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Platform list */}
      <div className="space-y-2">
        {platforms.length === 0 ? (
          <p className="text-muted-foreground text-sm py-2">
            No platforms configured. Add a platform to start tracking playback tests.
          </p>
        ) : (
          platforms.map((platform) => (
            <div
              key={platform.id}
              className="flex items-center gap-3 py-2 px-3 rounded-md bg-muted/50"
            >
              {/* Name (editable) + Test count badge */}
              {editingId === platform.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(platform.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSaveEdit(platform.id)}
                  >
                    <Check className="h-4 w-4 text-success-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm font-medium">{platform.name}</span>
                  {platform._count && platform._count.playbackTests > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {platform._count.playbackTests} test{platform._count.playbackTests !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              )}

              {/* Required toggle */}
              {editingId !== platform.id && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`required-${platform.id}`}
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Required
                  </label>
                  <Switch
                    id={`required-${platform.id}`}
                    checked={platform.isRequired}
                    onCheckedChange={() => handleToggleRequired(platform)}
                  />
                </div>
              )}

              {/* Actions */}
              {editingId !== platform.id && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleStartEdit(platform)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive-foreground hover:text-destructive-foreground"
                    onClick={() => setDeletingPlatform(platform)}
                    disabled={platform._count && platform._count.playbackTests > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add new platform */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="New platform name..."
          value={newPlatformName}
          onChange={(e) => setNewPlatformName(e.target.value)}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddPlatform();
          }}
        />
        <Button
          onClick={handleAddPlatform}
          disabled={!newPlatformName.trim() || addingPlatform}
          size="sm"
        >
          {addingPlatform ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Add
        </Button>
      </div>

      {/* Help text */}
      <p className="text-sm text-muted-foreground">
        Platforms marked as &quot;Required&quot; must pass playback tests for a file to be verified.
        Files are marked as &quot;Verified&quot; when all required platforms pass, and &quot;Broken&quot; if any fail.
      </p>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deletingPlatform !== null} onOpenChange={(open) => !open && setDeletingPlatform(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Platform</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingPlatform?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
