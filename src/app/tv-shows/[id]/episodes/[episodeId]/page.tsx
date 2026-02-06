import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatFileSize, formatDuration, formatDateWithFormat } from "@/lib/format";
import { getStatusVariant } from "@/lib/status";
import { getSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileCheck, FileX, Clock, HardDrive } from "lucide-react";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; episodeId: string }>;
}

export default async function EpisodeDetailPage({ params }: Props) {
  const [{ id, episodeId }, settings] = await Promise.all([
    params,
    getSettings(),
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
          compatibilityTests: true,
        },
      },
    },
  });

  if (!episode || episode.season.tvShow.id !== showId) {
    notFound();
  }

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
          <Badge variant={getStatusVariant(episode.status)} className="text-sm">
            {episode.status}
          </Badge>
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
                      {file.container && (
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground text-xs">Container</p>
                          <p className="font-semibold">{file.container.toUpperCase()}</p>
                        </div>
                      )}
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

                  {/* Video Quality */}
                  {(file.resolution || file.codec || file.bitrate || file.hdrType) && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Video Quality</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {file.resolution && (
                          <div className="bg-muted p-2 rounded">
                            <p className="text-muted-foreground text-xs">Resolution</p>
                            <p className="font-semibold">{file.resolution}</p>
                          </div>
                        )}
                        {file.codec && (
                          <div className="bg-muted p-2 rounded">
                            <p className="text-muted-foreground text-xs">Codec</p>
                            <p className="font-semibold">{file.codec}</p>
                          </div>
                        )}
                        {file.bitrate && (
                          <div className="bg-muted p-2 rounded">
                            <p className="text-muted-foreground text-xs">Bitrate</p>
                            <p className="font-semibold">{(file.bitrate / 1000).toFixed(1)} Mbps</p>
                          </div>
                        )}
                        {file.hdrType && (
                          <div className="bg-muted p-2 rounded">
                            <p className="text-muted-foreground text-xs">HDR</p>
                            <p className="font-semibold">{file.hdrType}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Audio */}
                  {(file.audioFormat || file.audioLanguages) && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Audio</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {file.audioFormat && (
                          <div className="bg-muted p-2 rounded">
                            <p className="text-muted-foreground text-xs">Format</p>
                            <p className="font-semibold">{file.audioFormat}</p>
                          </div>
                        )}
                        {file.audioLanguages && (
                          <div className="bg-muted p-2 rounded col-span-2">
                            <p className="text-muted-foreground text-xs">Languages</p>
                            <p className="font-semibold">{file.audioLanguages}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subtitles */}
                  {file.subtitleLanguages && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Subtitles</h4>
                      <div className="bg-muted p-2 rounded text-sm inline-block">
                        <p className="text-muted-foreground text-xs">Languages</p>
                        <p className="font-semibold">{file.subtitleLanguages}</p>
                      </div>
                    </div>
                  )}

                  {/* Status & Management */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Status & Management</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Status</p>
                        <Badge variant={getStatusVariant(file.status)}>
                          {file.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Action</p>
                        <Badge variant="outline">{file.action}</Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Arr Status</p>
                        <Badge variant={file.arrStatus === 'MONITORED' ? 'default' : 'secondary'}>
                          {file.arrStatus}
                        </Badge>
                      </div>
                      {file.metadataSource && (
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Metadata Source</p>
                          <Badge variant="outline">{file.metadataSource}</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plex Integration */}
                  {file.plexMatched && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Plex Integration</h4>
                      <Badge variant="default" className="gap-1">
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

                  {/* Compatibility Tests */}
                  {file.compatibilityTests.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Compatibility Tests</h4>
                      <div className="flex flex-wrap gap-2">
                        {file.compatibilityTests.map((test) => (
                          <Badge key={test.id} variant={getStatusVariant(test.status)}>
                            {test.platform}: {test.status}
                          </Badge>
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
