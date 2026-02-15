import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFileSize, formatDuration, formatDateWithFormat } from "@/lib/format";
import { computeEpisodeQuality } from "@/lib/status";
import { getSettings } from "@/lib/settings";
import { isFFprobeAvailable } from "@/lib/ffprobe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileCheck, FileX, Clock, HardDrive } from "lucide-react";
import { EpisodeDetailStatusBadges } from "./episode-detail-status-badges";
import { FileStatusBadges } from "./file-status-badges";
import { FileRescanButton } from "./file-rescan-button";
import { MediaInfoSection } from "@/components/files/media-info-section";
import { IssueReportDialog } from "@/components/issues/issue-report-dialog";
import { EpisodePlaybackTests } from "./episode-playback-tests";
import { EpisodeIssuesList } from "./episode-issues-list";
import { PageContainer } from "@/components/layout";
import { PageBreadcrumbs } from "@/components/page-breadcrumbs";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; episodeId: string }>;
}

export default async function EpisodeDetailPage({ params }: Props) {
  const [{ id, episodeId }, settings, ffprobeAvailable] = await Promise.all([
    params,
    getSettings(),
    isFFprobeAvailable(),
  ]);
  const dateFormat = settings.dateFormat;
  const showId = parseInt(id, 10);
  const episodeIdNum = parseInt(episodeId, 10);

  if (isNaN(showId) || isNaN(episodeIdNum)) {
    notFound();
  }

  const [episode, platforms] = await Promise.all([
    prisma.episode.findUnique({
      where: { id: episodeIdNum },
      include: {
        season: {
          include: {
            tvShow: true,
          },
        },
        files: {
          include: {
            playbackTests: {
              include: {
                platform: true,
              },
              orderBy: {
                testedAt: 'desc',
              },
            },
            tracks: {
              orderBy: [
                { trackType: 'asc' },
                { trackIndex: 'asc' },
              ],
            },
          },
        },
        issues: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, username: true, thumbUrl: true } },
            resolvedBy: { select: { id: true, username: true } },
          },
        },
      },
    }),
    prisma.platform.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  if (!episode || episode.season.tvShow.id !== showId) {
    notFound();
  }

  // Compute episode quality status from files
  const qualityStatus = computeEpisodeQuality(episode.monitorStatus, episode.files);

  return (
    <PageContainer maxWidth="wide">
      <PageBreadcrumbs items={[
        { label: 'TV Shows', href: '/tv-shows' },
        { label: episode.season.tvShow.title, href: `/tv-shows/${episode.season.tvShow.id}` },
        { label: `S${String(episode.season.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}` },
      ]} />
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold">
              S{String(episode.season.seasonNumber).padStart(2, "0")}E{String(episode.episodeNumber).padStart(2, "0")}: {episode.title || "Untitled"}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mt-2">
              {episode.season.tvShow.title}
            </p>
          </div>
          <div className="sm:flex-shrink-0">
            <EpisodeDetailStatusBadges
              episodeId={episode.id}
              monitorStatus={episode.monitorStatus}
              qualityStatus={qualityStatus}
            />
          </div>
        </div>

        {episode.notes && (
          <p className="text-muted-foreground max-w-2xl mt-4">{episode.notes}</p>
        )}
      </div>

      {/* Files + Issues two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 md:gap-8">
        {/* Files Section (left) */}
        <div>
          <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Files ({episode.files.length})</h2>

          {episode.files.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No files found for this episode.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 md:space-y-6">
              {episode.files.map((file) => (
                <Card key={file.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg break-all">{file.filename}</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground break-all mt-1">{file.filepath}</p>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-shrink-0">
                        {file.fileExists ? (
                          <Badge variant="outline" className="gap-1">
                            <FileCheck className="h-3 w-3" />
                            On Disk
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <FileX className="h-3 w-3" />
                            Missing
                          </Badge>
                        )}
                        <FileRescanButton fileId={file.id} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* File Info */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">File Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground text-xs">Size</p>
                          <p className="font-semibold">{formatFileSize(file.fileSize)}</p>
                        </div>
                        {file.duration && (
                          <div className="bg-muted p-2 rounded">
                            <p className="text-muted-foreground text-xs">Duration</p>
                            <p className="font-semibold">{formatDuration(file.duration)}</p>
                          </div>
                        )}
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground text-xs">Modified</p>
                          <p className="font-semibold text-xs">{formatDateWithFormat(file.dateModified, dateFormat)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status & Management */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">Status & Management</h4>
                      <FileStatusBadges
                        fileId={file.id}
                        quality={file.quality}
                        action={file.action}
                      />
                    </div>

                    {/* Media Analysis Section */}
                    <MediaInfoSection
                      file={{
                        id: file.id,
                        filename: file.filename,
                        fileExists: file.fileExists,
                        resolution: file.resolution,
                        codec: file.codec,
                        container: file.container,
                        duration: file.duration,
                        bitrate: file.bitrate,
                        audioFormat: file.audioFormat,
                        hdrType: file.hdrType,
                        audioLanguages: file.audioLanguages,
                        subtitleLanguages: file.subtitleLanguages,
                        mediaInfoExtractedAt: file.mediaInfoExtractedAt,
                        mediaInfoError: file.mediaInfoError,
                        metadataSource: file.metadataSource,
                        tracks: file.tracks,
                      }}
                      ffprobeAvailable={ffprobeAvailable}
                      dateFormat={dateFormat}
                    />

                    {/* Plex Integration */}
                    {file.plexMatched && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Plex Integration</h4>
                        <Badge variant="secondary" className="gap-1">
                          <HardDrive className="h-3 w-3" />
                          Matched in Plex
                        </Badge>
                      </div>
                    )}

                    {/* Notes */}
                    {file.notes && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          {file.notes}
                        </p>
                      </div>
                    )}

                    {/* Playback Tests */}
                    <EpisodePlaybackTests
                      fileId={file.id}
                      episodeId={episode.id}
                      tests={file.playbackTests.map((t) => ({
                        id: t.id,
                        platformId: t.platform.id,
                        platform: { id: t.platform.id, name: t.platform.name, isRequired: t.platform.isRequired },
                        status: t.status,
                        notes: t.notes,
                        testedAt: t.testedAt.toISOString(),
                      }))}
                      dateFormat={dateFormat}
                    />

                    {/* Timestamps */}
                    <div className="pt-3 border-t text-xs text-muted-foreground flex gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Added: {formatDateWithFormat(file.createdAt, dateFormat)}
                      </span>
                      <span>Updated: {formatDateWithFormat(file.updatedAt, dateFormat)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Issues Section (right sidebar) */}
        <div className="lg:sticky lg:top-8 lg:self-start space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base md:text-lg font-bold">Issues ({episode.issues.length})</h2>
            <IssueReportDialog
              episodeId={episode.id}
              episodeLabel={`${episode.season.tvShow.title} — S${String(episode.season.seasonNumber).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")}`}
              platforms={platforms.map((p) => p.name)}
              audioLanguages={collectLanguages(episode.files, 'audioLanguages')}
              subtitleLanguages={collectLanguages(episode.files, 'subtitleLanguages')}
            />
          </div>
          {episode.issues.length > 0 ? (
            <EpisodeIssuesList
              issues={episode.issues}
              dateFormat={dateFormat}
              episodeLabel={`${episode.season.tvShow.title} — S${String(episode.season.seasonNumber).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")}`}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="size-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No issues reported for this episode.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

/** Collect unique languages from episode files */
function collectLanguages(
  files: Array<{ audioLanguages: string | null; subtitleLanguages: string | null }>,
  field: 'audioLanguages' | 'subtitleLanguages'
): string[] {
  const langs = new Set<string>();
  for (const file of files) {
    const value = file[field];
    if (value) {
      // Languages are stored as comma-separated or JSON
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) parsed.forEach((l: string) => langs.add(l));
      } catch {
        value.split(',').map((l) => l.trim()).filter(Boolean).forEach((l) => langs.add(l));
      }
    }
  }
  return Array.from(langs);
}
