'use client';

/**
 * Issue Report Dialog — Quick report UX
 * Chip-based type selection, optional context (device, language), optional description
 * Designed for fast, low-friction issue reporting
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
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
import { ISSUE_TYPE_LABELS, ISSUE_TYPES } from '@/lib/issue-utils';
import type { IssueType } from '@/generated/prisma/client';

interface IssueReportDialogProps {
  episodeId: number;
  episodeLabel: string;
  /** Available platforms for device selection (from Platform model) */
  platforms?: string[];
  /** Available audio languages from file metadata */
  audioLanguages?: string[];
  /** Available subtitle languages from file metadata */
  subtitleLanguages?: string[];
  /** Custom trigger element (defaults to "Something wrong?" button) */
  trigger?: React.ReactNode;
  /** Callback after successful submission */
  onSubmitted?: () => void;
}

export function IssueReportDialog({
  episodeId,
  episodeLabel,
  platforms = [],
  audioLanguages = [],
  subtitleLanguages = [],
  trigger,
  onSubmitted,
}: IssueReportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<IssueType | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedAudioLang, setSelectedAudioLang] = useState<string | null>(null);
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setSelectedType(null);
    setSelectedPlatform(null);
    setSelectedAudioLang(null);
    setSelectedSubtitleLang(null);
    setDescription('');
    setShowDetails(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId,
          type: selectedType,
          description: description.trim() || null,
          platform: selectedPlatform,
          audioLang: selectedAudioLang,
          subtitleLang: selectedSubtitleLang,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit issue');
      }

      toast.success('Issue reported — thanks!');
      setOpen(false);
      resetForm();
      onSubmitted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit issue');
    } finally {
      setSubmitting(false);
    }
  }, [selectedType, episodeId, description, selectedPlatform, selectedAudioLang, selectedSubtitleLang, resetForm, onSubmitted]);

  const hasContextOptions = platforms.length > 0 || audioLanguages.length > 0 || subtitleLanguages.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-1.5">
            <AlertTriangle className="size-3.5" />
            Something wrong?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>{episodeLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Step 1: Issue Type */}
          <div>
            <p className="text-sm font-medium mb-2">What&apos;s the problem?</p>
            <div className="flex flex-wrap gap-2">
              {ISSUE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selectedType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {ISSUE_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Context (shown after type selected) */}
          {selectedType && hasContextOptions && (
            <div className="space-y-3">
              {platforms.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Platform</p>
                  <div className="flex flex-wrap gap-1.5">
                    {platforms.map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPlatform(selectedPlatform === p ? null : p)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          selectedPlatform === p
                            ? 'bg-secondary text-secondary-foreground border-secondary'
                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {audioLanguages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Audio language</p>
                  <div className="flex flex-wrap gap-1.5">
                    {audioLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedAudioLang(selectedAudioLang === lang ? null : lang)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          selectedAudioLang === lang
                            ? 'bg-secondary text-secondary-foreground border-secondary'
                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {subtitleLanguages.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Subtitle language</p>
                  <div className="flex flex-wrap gap-1.5">
                    {subtitleLanguages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedSubtitleLang(selectedSubtitleLang === lang ? null : lang)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          selectedSubtitleLang === lang
                            ? 'bg-secondary text-secondary-foreground border-secondary'
                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Details (optional, expandable) */}
          {selectedType && (
            <div>
              {!showDetails ? (
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  + Add more details
                </button>
              ) : (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in more detail..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  rows={3}
                  autoFocus
                />
              )}
            </div>
          )}

          {/* Summary */}
          {selectedType && (
            <div className="flex flex-wrap gap-1.5 text-xs">
              <Badge variant="outline">{ISSUE_TYPE_LABELS[selectedType]}</Badge>
              {selectedPlatform && <Badge variant="secondary">{selectedPlatform}</Badge>}
              {selectedAudioLang && <Badge variant="secondary">Audio: {selectedAudioLang}</Badge>}
              {selectedSubtitleLang && <Badge variant="secondary">Sub: {selectedSubtitleLang}</Badge>}
            </div>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!selectedType || submitting}
            className="w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
