import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string; seasonId: string; episodeId: string }>;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "GOOD":
    case "WORKS":
      return "default";
    case "BAD":
    case "FAILS":
      return "destructive";
    case "TO_CHECK":
    case "NEEDS_TRANSCODING":
      return "secondary";
    default:
      return "outline";
  }
}

export default async function EpisodeDetailPage({ params }: Props) {
  const { id, seasonId, episodeId } = await params;
  const showId = parseInt(id, 10);
  const seasonNumber = parseInt(seasonId, 10);
  const episodeNumber = parseInt(episodeId, 10);

  if (isNaN(showId) || isNaN(seasonNumber) || isNaN(episodeNumber)) {
    notFound();
  }

  const episode = await prisma.episode.findUnique({
    where: { id: episodeNumber },
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

  if (!episode || episode.season.tvShow.id !== showId || episode.season.id !== seasonNumber) {
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
        <Link
          href={`/tv-shows/${id}/seasons/${seasonId}`}
          className="text-primary hover:underline whitespace-nowrap"
        >
          Season {episode.season.seasonNumber}
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground whitespace-nowrap">
          Episode {episode.episodeNumber}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">
              E{String(episode.episodeNumber).padStart(2, "0")}: {episode.title || "Untitled"}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              {episode.season.tvShow.title} • Season {episode.season.seasonNumber}
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
          <div className="space-y-4">
            {episode.files.map((file) => (
              <Card key={file.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg break-all">{file.filename}</CardTitle>
                  <p className="text-sm text-muted-foreground break-all">{file.filepath}</p>
                </CardHeader>
                <CardContent>
                  {/* Quality Info */}
                  {(file.resolution || file.codec || file.bitrate || file.hdrType) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                      {file.resolution && (
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground">Resolution</p>
                          <p className="font-semibold">{file.resolution}</p>
                        </div>
                      )}
                      {file.codec && (
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground">Codec</p>
                          <p className="font-semibold">{file.codec}</p>
                        </div>
                      )}
                      {file.bitrate && (
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground">Bitrate</p>
                          <p className="font-semibold">{file.bitrate} kbps</p>
                        </div>
                      )}
                      {file.hdrType && (
                        <div className="bg-muted p-2 rounded">
                          <p className="text-muted-foreground">HDR</p>
                          <p className="font-semibold">{file.hdrType}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status and Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant={getStatusVariant(file.status)} className="mt-1">
                        {file.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Action</p>
                      <p className="font-semibold">{file.action}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Arr Status</p>
                      <p className="font-semibold">{file.arrStatus}</p>
                    </div>
                  </div>

                  {/* Compatibility Tests */}
                  {file.compatibilityTests.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Compatibility Tests</p>
                      <div className="flex flex-wrap gap-2">
                        {file.compatibilityTests.map((test) => (
                          <Badge key={test.id} variant={getStatusVariant(test.status)}>
                            {test.platform}: {test.status}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
