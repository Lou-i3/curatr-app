'use client';

/**
 * Shared Edit Playback Test Dialog
 * Reusable dialog for editing a single playback test.
 * Used from: Playback Tests page, PlaybackTestDialog (show page + episode page)
 */

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PLAYBACK_STATUS_OPTIONS } from '@/lib/status';
import type { PlaybackStatus } from '@/generated/prisma/client';

export interface EditableTest {
  id: number;
  status: PlaybackStatus;
  notes: string | null;
  testedAt: string;
  platformName: string;
}

interface EditTestDialogProps {
  test: EditableTest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

/** Format ISO date string to datetime-local input value */
function toDateTimeLocal(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().slice(0, 16);
}

export function EditTestDialog({
  test,
  open,
  onOpenChange,
  onSaved,
}: EditTestDialogProps) {
  const [status, setStatus] = useState<PlaybackStatus>(test.status);
  const [notes, setNotes] = useState(test.notes || '');
  const [testedAt, setTestedAt] = useState(toDateTimeLocal(test.testedAt));
  const [saving, setSaving] = useState(false);

  // Reset form when test changes
  const resetForm = () => {
    setStatus(test.status);
    setNotes(test.notes || '');
    setTestedAt(toDateTimeLocal(test.testedAt));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/playback-tests/${test.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: notes || null,
          testedAt: testedAt ? new Date(testedAt).toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update test');
      }

      toast.success('Playback test updated');
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error('Failed to update playback test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Playback Test</DialogTitle>
          <DialogDescription>{test.platformName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
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

          <div className="space-y-2">
            <Label>Tested At</Label>
            <Input
              type="datetime-local"
              value={testedAt}
              onChange={(e) => setTestedAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
