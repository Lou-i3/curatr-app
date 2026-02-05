import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 0;

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

export default async function TVShowsPage() {
  const shows = await prisma.tVShow.findMany({
    include: {
      seasons: {
        include: {
          episodes: true,
        },
      },
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">TV Shows</h1>
        <p className="text-muted-foreground">
          Browse and manage your TV show library
        </p>
      </div>

      {shows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-2">
              No TV shows in your library yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Run a filesystem scan to populate your library.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shows.map((show) => (
            <Link
              key={show.id}
              href={`/tv-shows/${show.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {show.title}
                      </h2>
                      {show.year && (
                        <p className="text-sm text-muted-foreground">
                          {show.year}
                        </p>
                      )}
                    </div>
                    <Badge variant={getStatusVariant(show.status)}>
                      {show.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-muted p-3 rounded">
                      <p className="text-muted-foreground">Seasons</p>
                      <p className="text-2xl font-bold">
                        {show.seasons.length}
                      </p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <p className="text-muted-foreground">Episodes</p>
                      <p className="text-2xl font-bold">
                        {show.seasons.reduce(
                          (acc, season) => acc + season.episodes.length,
                          0
                        )}
                      </p>
                    </div>
                    <div className="bg-muted p-3 rounded">
                      <p className="text-muted-foreground">Last Updated</p>
                      <p className="text-xs truncate">
                        {show.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {show.notes && (
                    <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                      {show.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
