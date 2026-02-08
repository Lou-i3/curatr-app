'use client';

/**
 * Changelog page - displays GitHub releases
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { formatDateTimeWithFormat, type DateFormat } from '@/lib/settings-shared';
import { PageHeader } from '@/components/page-header';

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  prerelease: boolean;
}

export default function ChangelogPage() {
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFormat, setDateFormat] = useState<DateFormat>('EU');

  const fetchReleases = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(
        'https://api.github.com/repos/Lou-i3/curatr-app/releases',
        {
          headers: { 'Accept': 'application/vnd.github+json' },
          cache: 'no-store',
        }
      );

      if (res.ok) {
        setReleases(await res.json());
      }
    } catch (error) {
      console.error('Error fetching releases:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReleases();
    // Fetch date format setting
    fetch('/api/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.dateFormat) setDateFormat(data.dateFormat);
      })
      .catch(() => {});
  }, [fetchReleases]);

  return (
    <div className="p-8">
      <PageHeader
        title="Changelog"
        description="Release history and version notes"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReleases(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </>
        ) : releases.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No releases yet. Releases will appear here once published on GitHub.
            </CardContent>
          </Card>
        ) : (
          releases.map((release) => (
            <ReleaseCard key={release.id} release={release} dateFormat={dateFormat} />
          ))
        )}
      </div>
    </div>
  );
}

function ReleaseCard({ release, dateFormat }: { release: GitHubRelease; dateFormat: DateFormat }) {
  const publishedDate = formatDateTimeWithFormat(new Date(release.published_at), dateFormat);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {release.tag_name}
            {release.prerelease && (
              <Badge variant="outline">Pre-release</Badge>
            )}
          </CardTitle>
          <span className="text-sm text-muted-foreground">{publishedDate}</span>
        </div>
        {release.name && release.name !== release.tag_name && (
          <CardDescription>{release.name}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {release.body ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReleaseBody body={release.body} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No release notes</p>
        )}
        <div className="mt-4 pt-4 border-t">
          <a
            href={release.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View on GitHub
            <ExternalLink className="size-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simple markdown renderer for release notes
 * Handles: headings, links, and list items
 */
function ReleaseBody({ body }: { body: string }) {
  const lines = body.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Heading: ## Title
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="text-base font-semibold mt-4 first:mt-0">
              {trimmed.slice(3)}
            </h3>
          );
        }

        // List item: - text ([hash](url))
        if (trimmed.startsWith('- ')) {
          const content = trimmed.slice(2);
          return (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-muted-foreground">•</span>
              <span>{parseInlineLinks(content)}</span>
            </div>
          );
        }

        // Regular text
        return (
          <p key={i} className="text-sm">
            {parseInlineLinks(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Parse markdown links [text](url) into clickable elements
 */
function parseInlineLinks(text: string): React.ReactNode {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the link
    parts.push(
      <a
        key={match.index}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-mono text-xs"
      >
        {match[1]}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
