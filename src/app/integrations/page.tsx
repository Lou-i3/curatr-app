/**
 * Integrations Hub page
 * Lists all available integrations with their status
 */

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileSearch } from 'lucide-react';
import { isTmdbConfigured } from '@/lib/tmdb';
import { isFFprobeAvailable } from '@/lib/ffprobe';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/page-header';
import { PageContainer } from '@/components/layout';
import { getAuthMode } from '@/lib/auth';
import { isPlexConfigured } from '@/lib/plex/auth';

/** Integration definition */
interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  configured: boolean;
  stats?: string;
  comingSoon?: boolean;
}

/** TMDB logo - simplified green gradient badge */
function TmdbLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="url(#tmdb-gradient)" />
      <text x="12" y="14" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="sans-serif">
        TMDB
      </text>
      <defs>
        <linearGradient id="tmdb-gradient" x1="2" y1="4" x2="22" y2="20">
          <stop stopColor="#90CEA1" />
          <stop offset="1" stopColor="#01B4E4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

async function getIntegrations(): Promise<Integration[]> {
  const tmdbConfigured = isTmdbConfigured();
  const ffprobeAvailable = await isFFprobeAvailable();

  let tmdbStats: string | undefined;
  if (tmdbConfigured) {
    const [total, matched] = await Promise.all([
      prisma.tVShow.count(),
      prisma.tVShow.count({ where: { tmdbId: { not: null } } }),
    ]);
    if (total > 0) {
      tmdbStats = `${matched}/${total} shows matched`;
    }
  }

  let ffprobeStats: string | undefined;
  const [totalFiles, analyzedFiles] = await Promise.all([
    prisma.episodeFile.count({ where: { fileExists: true } }),
    prisma.episodeFile.count({
      where: { fileExists: true, mediaInfoExtractedAt: { not: null }, mediaInfoError: null },
    }),
  ]);
  if (totalFiles > 0) {
    ffprobeStats = `${analyzedFiles}/${totalFiles} files analyzed`;
  }

  const authMode = getAuthMode();
  const plexConfigured = isPlexConfigured();
  const plexEnabled = authMode === 'plex';

  let plexStats: string | undefined;
  if (plexConfigured) {
    const plexUserCount = await prisma.user.count({ where: { plexId: { not: 'local' } } });
    if (plexUserCount > 0) {
      plexStats = `${plexUserCount} user${plexUserCount === 1 ? '' : 's'}`;
    }
    if (!plexEnabled) {
      plexStats = 'Configured but not enabled';
    }
  }

  return [
    {
      id: 'tmdb',
      name: 'TMDB',
      description: 'Enrich your library with metadata, posters, and descriptions from The Movie Database.',
      icon: <TmdbLogo className="size-6" />,
      href: '/integrations/tmdb',
      configured: tmdbConfigured,
      stats: tmdbStats,
    },
    {
      id: 'ffprobe',
      name: 'FFprobe',
      description: 'Analyze media files to extract video quality, audio tracks, and subtitle information.',
      icon: <FileSearch className="size-6" />,
      href: '/integrations/ffprobe',
      configured: ffprobeAvailable,
      stats: ffprobeStats,
    },
    {
      id: 'plex',
      name: 'Plex Auth',
      description: 'Enable multi-user access with Plex account login. Users can browse the library and report issues.',
      icon: (
        <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.643 0L2.805 24H12.357L21.195 0H11.643Z" />
        </svg>
      ),
      href: '/integrations/plex',
      configured: plexEnabled,
      stats: plexStats,
    },
    {
      id: 'plex-db',
      name: 'Plex DB Sync',
      description: 'Read-only sync with your Plex database for file matching and metadata enrichment.',
      icon: (
        <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.643 0L2.805 24H12.357L21.195 0H11.643Z" />
        </svg>
      ),
      href: '/integrations/plex-db',
      configured: false,
      comingSoon: true,
    },
    {
      id: 'sonarr',
      name: 'Sonarr',
      description: 'Sync TV show monitoring status and trigger downloads for missing episodes.',
      icon: (
        <svg className="size-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm0 3a7 7 0 100 14 7 7 0 000-14z" />
        </svg>
      ),
      href: '/integrations/sonarr',
      configured: false,
      comingSoon: true,
    },
  ];
}

export default async function IntegrationsPage() {
  const integrations = await getIntegrations();

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Integrations"
        description="Connect external services to enrich your library with metadata and automate workflows."
        breadcrumbs={[{ label: 'Integrations' }]}
      />

      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </PageContainer>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const content = (
    <Card className={`h-full ${integration.comingSoon ? 'opacity-60' : 'hover:border-primary/50 transition-colors'}`}>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          {integration.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{integration.name}</CardTitle>
            {integration.comingSoon ? (
              <Badge variant="secondary">Coming Soon</Badge>
            ) : integration.configured ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="outline">Not Configured</Badge>
            )}
          </div>
          {integration.stats && (
            <p className="text-sm text-muted-foreground">{integration.stats}</p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{integration.description}</CardDescription>
      </CardContent>
    </Card>
  );

  if (integration.comingSoon) {
    return content;
  }

  return (
    <Link href={integration.href} className="block">
      {content}
    </Link>
  );
}
