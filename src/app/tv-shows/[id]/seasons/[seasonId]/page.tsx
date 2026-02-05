import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight } from "lucide-react";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string; seasonId: string }>;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "GOOD":
      return "default";
    case "BAD":
      return "destructive";
    case "TO_CHECK":
      return "secondary";
    default:
      return "outline";
  }
}

export default async function SeasonDetailPage({ params }: Props) {
  const { id, seasonId } = await params;
  const showId = parseInt(id, 10);
  const seasonNumber = parseInt(seasonId, 10);

  if (isNaN(showId) || isNaN(seasonNumber)) {
    notFound();
  }

  const season = await prisma.season.findUnique({
    where: { id: seasonNumber },
    include: {
      tvShow: true,
      episodes: {
        orderBy: { episodeNumber: "asc" },
        include: {
          files: true,
        },
      },
    },
  });

  if (!season || season.tvShow.id !== showId) {
    notFound();
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/tv-shows" className="text-primary hover:underline">
          TV Shows
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <Link href={`/tv-shows/${id}`} className="text-primary hover:underline">
          {season.tvShow.title}
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Season {season.seasonNumber}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-3xl font-bold">
            {season.tvShow.title} — Season {season.seasonNumber}
          </h1>
          <Badge variant={getStatusVariant(season.status)} className="text-sm">
            {season.status}
          </Badge>
        </div>

        {season.notes && (
          <p className="text-muted-foreground max-w-2xl">{season.notes}</p>
        )}
      </div>

      {/* Episodes Table */}
      <Card>
        <CardContent className="p-0">
          {season.episodes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No episodes found in this season.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Episode</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Files</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {season.episodes.map((episode) => (
                  <TableRow key={episode.id}>
                    <TableCell className="font-medium">
                      E{String(episode.episodeNumber).padStart(2, "0")}
                    </TableCell>
                    <TableCell>{episode.title || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(episode.status)}>
                        {episode.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {episode.files.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/tv-shows/${id}/seasons/${seasonId}/episodes/${episode.id}`}
                        >
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
