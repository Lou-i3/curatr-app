'use client';

/**
 * Issue Edit Form
 * Allows the issue owner to edit type, description, platform, and languages while the issue is OPEN
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ISSUE_TYPE_LABELS, ISSUE_TYPES, ISSUE_SUB_TYPES, ISSUE_SUB_TYPE_LABELS, TYPES_WITH_SUB_TYPE, type IssueSubType } from '@/lib/issue-utils';
import { getLanguageName } from '@/lib/languages';
import type { IssueType } from '@/generated/prisma/client';

interface IssueEditFormProps {
  issue: {
    id: number;
    type: IssueType;
    description: string | null;
    platform: string | null;
    audioLang: string | null;
    subtitleLang: string | null;
    subType: string | null;
    episodes: Array<{ episodeId: number }>;
  };
  onSaved: () => void;
  onCancel: () => void;
}

export function IssueEditForm({ issue, onSaved, onCancel }: IssueEditFormProps) {
  const [type, setType] = useState<IssueType>(issue.type);
  const [subType, setSubType] = useState<IssueSubType | null>(
    issue.subType as IssueSubType | null
  );
  const [description, setDescription] = useState(issue.description || '');
  const [platform, setPlatform] = useState<string | null>(issue.platform);
  const [audioLang, setAudioLang] = useState<string | null>(issue.audioLang);
  const [subtitleLang, setSubtitleLang] = useState<string | null>(issue.subtitleLang);
  const [submitting, setSubmitting] = useState(false);

  // Context data
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [audioLanguages, setAudioLanguages] = useState<string[]>([]);
  const [subtitleLanguages, setSubtitleLanguages] = useState<string[]>([]);

  // Fetch platforms and languages
  useEffect(() => {
    fetch('/api/platforms')
      .then((r) => r.json())
      .then((data) => setPlatforms(data.map((p: { name: string }) => p.name)))
      .catch(() => {});

    const ids = issue.episodes.map((e) => e.episodeId).join(',');
    if (ids) {
      fetch(`/api/episodes/languages?ids=${ids}`)
        .then((r) => r.json())
        .then((data) => {
          setAudioLanguages(data.audioLanguages || []);
          setSubtitleLanguages(data.subtitleLanguages || []);
        })
        .catch(() => {});
    }
  }, [issue.episodes]);

  const handleSave = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subType: TYPES_WITH_SUB_TYPE.includes(type) ? subType : null,
          description: description.trim() || null,
          platform,
          audioLang,
          subtitleLang,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      toast.success('Issue updated');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  }, [issue.id, type, subType, description, platform, audioLang, subtitleLang, onSaved]);

  return (
    <div className="space-y-4">
      {/* Type */}
        <div>
          <p className="text-sm font-medium mb-2">Type</p>
          <div className="flex flex-wrap gap-2">
            {ISSUE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  if (!TYPES_WITH_SUB_TYPE.includes(t)) setSubType(null);
                }}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  type === t
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {ISSUE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-type (only for AUDIO/SUBTITLE) */}
        {TYPES_WITH_SUB_TYPE.includes(type) && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">What&apos;s the issue?</p>
            <div className="flex flex-wrap gap-1.5">
              {ISSUE_SUB_TYPES.map((st) => (
                <button
                  key={st}
                  onClick={() => setSubType(subType === st ? null : st)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    subType === st
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {ISSUE_SUB_TYPE_LABELS[st]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Platform */}
        {platforms.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Platform</p>
            <div className="flex flex-wrap gap-1.5">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(platform === p ? null : p)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    platform === p
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

        {/* Audio Language */}
        {audioLanguages.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Audio language</p>
            <div className="flex flex-wrap gap-1.5">
              {audioLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setAudioLang(audioLang === lang ? null : lang)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    audioLang === lang
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {getLanguageName(lang)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subtitle Language */}
        {subtitleLanguages.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Subtitle language</p>
            <div className="flex flex-wrap gap-1.5">
              {subtitleLanguages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSubtitleLang(subtitleLang === lang ? null : lang)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    subtitleLang === lang
                      ? 'bg-secondary text-secondary-foreground border-secondary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {getLanguageName(lang)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Description</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={submitting} size="sm">
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={onCancel} size="sm">
            Cancel
          </Button>
        </div>
    </div>
  );
}
