import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string; seasonId: string }>;
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
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <Link
            href="/tv-shows"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            TV Shows
          </Link>
          <span className="text-zinc-400">/</span>
          <Link
            href={`/tv-shows/${id}`}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {season.tvShow.title}
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-600 dark:text-zinc-400">
            Season {season.seasonNumber}
          </span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold text-black dark:text-white">
              {season.tvShow.title} — Season {season.seasonNumber}
            </h1>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                season.status
              )}`}
            >
              {season.status}
            </span>
          </div>

          {season.notes && (
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl">
              {season.notes}
            </p>
          )}
        </div>

        {/* Episodes Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden">
          {season.episodes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">
                No episodes found in this season.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-black dark:text-white">
                    Episode
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-black dark:text-white">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-black dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-black dark:text-white">
                    Files
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-black dark:text-white">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {season.episodes.map((episode, idx) => (
                  <tr
                    key={episode.id}
                    className={
                      idx % 2 === 0
                        ? ""
                        : "bg-zinc-50 dark:bg-zinc-800/50"
                    }
                  >
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      E{String(episode.episodeNumber).padStart(2, "0")}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-100">
                      {episode.title || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          episode.status
                        )}`}
                      >
                        {episode.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {episode.files.length}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/tv-shows/${id}/seasons/${seasonId}/episodes/${episode.id}`}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
