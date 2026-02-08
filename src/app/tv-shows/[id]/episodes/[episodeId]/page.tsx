import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFileSize, formatDuration, formatDateWithFormat, formatDateTimeWithFormat } from "@/lib/format";
import { computeEpisodeQuality, getPlaybackStatusVariant, PLAYBACK_STATUS_LABELS } from "@/lib/status";
import { getSettings } from "@/lib/settings";
import { isFFprobeAvailable } from "@/lib/ffprobe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileCheck, FileX, Clock, HardDrive, Calendar } from "lucide-react";
import { EpisodeDetailStatusBadges } from "./episode-detail-status-badges";
import { FileStatusBadges } from "./file-status-badges";
import { MediaInfoSection } from "@/components/files/media-info-section";

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

  const episode = await prisma.episode.findUnique({
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
    },
  });

  if (!episode || episode.season.tvShow.id !== showId) {
    notFound();
  }

  // Compute episode quality status from files
  const qualityStatus = computeEpisodeQuality(episode.monitorStatus, episode.files);

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm overflow-auto">
        <Link href="/tv-shows" className="text-primary hover:underline whitespace-nowrap">
          TV Shows
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Link href={`/tv-shows/${id}`} className="text-primary hover:underline whitespace-nowrap">
          {episode.season.tvShow.title}
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground whitespace-nowrap">
          S{String(episode.season.seasonNumber).padStart(2, "0")}E{String(episode.episodeNumber).padStart(2, "0")}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">
              S{String(episode.season.seasonNumber).padStart(2, "0")}E{String(episode.episodeNumber).padStart(2, "0")}: {episode.title || "Untitled"}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              {episode.season.tvShow.title}
            </p>
          </div>
          <EpisodeDetailStatusBadges
            episodeId={episode.id}
            monitorStatus={episode.monitorStatus}
            qualityStatus={qualityStatus}
          />
        </div>

        {episode.notes && (
          <p className="text-muted-foreground max-w-2xl">{episode.notes}</p>
        )}
      </div>

      {/* Files Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Files ({episode.files.length})</h2>

        {episode.files.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No files found for this episode.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {episode.files.map((file) => (
              <Card key={file.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg break-all">{file.filename}</CardTitle>
                      <p className="text-sm text-muted-foreground break-all mt-1">{file.filepath}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                  {file.playbackTests.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Playback Tests</h4>
                      <div className="space-y-2">
                        {file.playbackTests.map((test) => (
                          <div key={test.id} className="border rounded-lg p-3 space-y-2">
                            {/* Line 1: Platform */}
                            <div className="font-medium text-sm">
                              {test.platform.name}
                            </div>
                            {/* Line 2: Status, Date, Notes */}
                            <div className="flex items-center gap-4 flex-wrap">
                              <Badge variant={getPlaybackStatusVariant(test.status)}>
                                {PLAYBACK_STATUS_LABELS[test.status]}
                              </Badge>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateTimeWithFormat(test.testedAt, dateFormat)}
                              </div>
                              {test.notes && (
                                <span className="text-xs text-muted-foreground">
                                  {test.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
    </div>
  );
}
