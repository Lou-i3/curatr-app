import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "GOOD":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "BAD":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "TO_CHECK":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "DELETED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            TV Shows
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Browse and manage your TV show library
          </p>
        </div>

        {shows.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 text-center">
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">
              No TV shows in your library yet.
            </p>
            <p className="text-sm text-zinc-400">
              Run a filesystem scan to populate your library.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {shows.map((show) => (
              <Link
                key={show.id}
                href={`/tv-shows/${show.id}`}
                className="block"
              >
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-black dark:text-white">
                        {show.title}
                      </h2>
                      {show.year && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {show.year}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        show.status
                      )}`}
                    >
                      {show.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Seasons
                      </p>
                      <p className="text-2xl font-bold text-black dark:text-white">
                        {show.seasons.length}
                      </p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Episodes
                      </p>
                      <p className="text-2xl font-bold text-black dark:text-white">
                        {show.seasons.reduce(
                          (acc, season) => acc + season.episodes.length,
                          0
                        )}
                      </p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded">
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Last Updated
                      </p>
                      <p className="text-xs text-black dark:text-white truncate">
                        {show.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {show.notes && (
                    <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                      {show.notes}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
