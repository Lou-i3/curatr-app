'use client';

/**
 * Issue Edit Dialog — view issue details, change status, add resolution notes
 * Admin can change status and add resolution. Reporter can edit details while OPEN.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ISSUE_TYPE_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUSES,
  getIssueTypeVariant,
  getIssueStatusVariant,
} from '@/lib/issue-utils';
import type { IssueType, IssueStatus } from '@/generated/prisma/client';

interface IssueEditDialogProps {
  issue: {
    id: number;
    type: IssueType;
    status: IssueStatus;
    description: string | null;
    platform: string | null;
    resolution: string | null;
  };
  episodeLabel: string;
  isAdmin: boolean;
  isOwner: boolean;
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Callback after successful update */
  onUpdated?: (updated: { status: IssueStatus; resolution: string | null }) => void;
}

export function IssueEditDialog({
  issue,
  episodeLabel,
  isAdmin,
  isOwner,
  trigger,
  onUpdated,
}: IssueEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [resolution, setResolution] = useState(issue.resolution || '');
  const [submitting, setSubmitting] = useState(false);

  const hasChanges = status !== issue.status || (resolution.trim() || null) !== (issue.resolution || null);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {};

      if (isAdmin) {
        if (status !== issue.status) body.status = status;
        if ((resolution.trim() || null) !== (issue.resolution || null)) {
          body.resolution = resolution.trim() || null;
        }
      }

      const response = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update issue');
      }

      toast.success('Issue updated');
      setOpen(false);
      onUpdated?.({ status, resolution: resolution.trim() || null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update issue');
    } finally {
      setSubmitting(false);
    }
  }, [hasChanges, isAdmin, status, resolution, issue.id, issue.status, issue.resolution, onUpdated]);

  // Reset state when dialog opens
  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (v) {
      setStatus(issue.status);
      setResolution(issue.resolution || '');
    }
  }, [issue.status, issue.resolution]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="size-7">
            <Pencil className="size-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue Details</DialogTitle>
          <DialogDescription>{episodeLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type (read-only) */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Type</p>
            <Badge variant={getIssueTypeVariant(issue.type)}>
              {ISSUE_TYPE_LABELS[issue.type]}
            </Badge>
          </div>

          {/* Description (read-only) */}
          {issue.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm bg-muted p-2 rounded">{issue.description}</p>
            </div>
          )}

          {/* Platform (read-only) */}
          {issue.platform && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Platform</p>
              <Badge variant="outline">{issue.platform}</Badge>
            </div>
          )}

          {/* Status — admin can change */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Status</p>
            {isAdmin ? (
              <div className="flex flex-wrap gap-2">
                {ISSUE_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      status === s
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {ISSUE_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            ) : (
              <Badge variant={getIssueStatusVariant(issue.status)}>
                {ISSUE_STATUS_LABELS[issue.status]}
              </Badge>
            )}
          </div>

          {/* Resolution notes — admin can edit */}
          {isAdmin && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Resolution notes</p>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Add notes on how this was resolved..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Non-admin resolution display */}
          {!isAdmin && issue.resolution && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Resolution</p>
              <p className="text-sm bg-muted p-2 rounded">{issue.resolution}</p>
            </div>
          )}

          {/* Save button — only for admin or owner with changes */}
          {(isAdmin || isOwner) && (
            <Button
              onClick={handleSave}
              disabled={!hasChanges || submitting}
              className="w-full"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
