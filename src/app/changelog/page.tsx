/**
 * Changelog page - displays GitHub releases
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import { ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  prerelease: boolean;
}

async function getReleases(): Promise<GitHubRelease[]> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/Lou-i3/curatr-app/releases',
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
        headers: {
          'Accept': 'application/vnd.github+json',
        },
      }
    );

    if (!res.ok) {
      console.error('Failed to fetch releases:', res.status);
      return [];
    }

    return res.json();
  } catch (error) {
    console.error('Error fetching releases:', error);
    return [];
  }
}

export default async function ChangelogPage() {
  const releases = await getReleases();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Changelog</h1>
        <p className="text-muted-foreground">Release history and version notes</p>
      </div>

      <div className="space-y-6 max-w-3xl">
        {releases.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No releases yet. Releases will appear here once published on GitHub.
            </CardContent>
          </Card>
        ) : (
          releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))
        )}
      </div>
    </div>
  );
}

async function ReleaseCard({ release }: { release: GitHubRelease }) {
  const publishedDate = await formatDate(new Date(release.published_at));

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
          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
            {release.body}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground italic">No release notes</p>
        )}
        <div className="mt-4">
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
