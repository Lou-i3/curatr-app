'use client';

/**
 * Issue Comment Form
 * Textarea + submit button for adding comments to an issue
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IssueCommentFormProps {
  issueId: number;
  onCommentAdded: () => void;
}

export function IssueCommentForm({ issueId, onCommentAdded }: IssueCommentFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add comment');
      }
      setContent('');
      onCommentAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  }, [content, issueId, onCommentAdded]);

  return (
    <div className="flex gap-2 mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none min-w-0"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={!content.trim() || submitting}
        className="shrink-0 self-end"
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}
