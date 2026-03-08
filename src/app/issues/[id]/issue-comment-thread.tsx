'use client';

/**
 * Issue Comment Thread
 * Renders a timeline of COMMENT and ACTIVITY entries with different visual treatments
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Activity, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import type { IssueCommentType } from '@/generated/prisma/client';

interface CommentData {
  id: number;
  type: IssueCommentType;
  content: string;
  createdAt: string;
  user: { id: number; username: string; thumbUrl: string | null };
}

interface IssueCommentThreadProps {
  comments: CommentData[];
  dateFormat: DateFormat;
  isAdmin: boolean;
  issueId: number;
  onCommentDeleted: () => void;
}

export function IssueCommentThread({
  comments,
  dateFormat,
  isAdmin,
  issueId,
  onCommentDeleted,
}: IssueCommentThreadProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = useCallback(
    async (commentId: number) => {
      if (!confirm('Delete this comment?')) return;
      setDeletingId(commentId);
      try {
        const res = await fetch(`/api/issues/${issueId}/comments/${commentId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to delete');
        }
        toast.success('Comment deleted');
        onCommentDeleted();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete');
      } finally {
        setDeletingId(null);
      }
    },
    [issueId, onCommentDeleted]
  );

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No comments or activity yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        if (comment.type === 'ACTIVITY') {
          return (
            <div key={comment.id} className="flex items-start gap-2 py-1">
              <Activity className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {comment.user.username}
                  </span>{' '}
                  {comment.content}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDateTimeWithFormat(new Date(comment.createdAt), dateFormat)}
                </p>
              </div>
            </div>
          );
        }

        // COMMENT type
        return (
          <div
            key={comment.id}
            className="rounded-md border bg-card p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              {comment.user.thumbUrl ? (
                <img
                  src={comment.user.thumbUrl}
                  alt={comment.user.username}
                  className="size-5 rounded-full shrink-0"
                />
              ) : (
                <div className="size-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="size-3 text-muted-foreground" />
                </div>
              )}
              <span className="text-xs font-medium">{comment.user.username}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {formatDateTimeWithFormat(new Date(comment.createdAt), dateFormat)}
              </span>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-destructive-foreground"
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                >
                  <Trash2 className="size-3" />
                </Button>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          </div>
        );
      })}
    </div>
  );
}
