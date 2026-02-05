import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShowDetailPage({ params }: Props) {
  const { id } = await params;
  const showId = parseInt(id, 10);

  if (isNaN(showId)) {
    notFound();
  }

  const show = await prisma.tVShow.findUnique({
    where: { id: showId },
    include: {
      seasons: {
        orderBy: { seasonNumber: "asc" },
        include: {
          episodes: {
            orderBy: { episodeNumber: "asc" },
          },
        },
      },
    },
  });

  if (!show) {
    notFound();
  }

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

  const totalEpisodes = show.seasons.reduce(
    (acc, season) => acc + season.episodes.length,
    0
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href="/tv-shows"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            TV Shows
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-600 dark:text-zinc-400">{show.title}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-black dark:text-white">
                {show.title}
              </h1>
              {show.year && (
                <p className="text-lg text-zinc-600 dark:text-zinc-400">
                  {show.year}
                </p>
              )}
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                show.status
              )}`}
            >
              {show.status}
            </span>
          </div>

          {show.notes && (
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl">
              {show.notes}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg">
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">
              Seasons
            </p>
            <p className="text-3xl font-bold text-black dark:text-white">
              {show.seasons.length}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg">
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">
              Episodes
            </p>
            <p className="text-3xl font-bold text-black dark:text-white">
              {totalEpisodes}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg">
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-2">
              Last Updated
            </p>
            <p className="text-lg font-semibold text-black dark:text-white">
              {show.updatedAt.toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Seasons */}
        <div>
          <h2 className="text-2xl font-bold text-black dark:text-white mb-6">
            Seasons
          </h2>
          {show.seasons.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">
                No seasons found.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {show.seasons.map((season) => (
                <Link
                  key={season.id}
                  href={`/tv-shows/${show.id}/seasons/${season.id}`}
                  className="block"
                >
                  <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                          Season {season.seasonNumber}
                        </h3>
                        {season.notes && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1">
                            {season.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Episodes
                          </p>
                          <p className="text-2xl font-bold text-black dark:text-white">
                            {season.episodes.length}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 h-fit rounded-full text-sm font-medium ${getStatusColor(
                            season.status
                          )}`}
                        >
                          {season.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
