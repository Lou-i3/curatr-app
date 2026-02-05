import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string; seasonId: string; episodeId: string }>;
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

  const getTestStatusColor = (status: string) => {
    switch (status) {
      case "WORKS":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "FAILS":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "NEEDS_TRANSCODING":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      case "NOT_TESTED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm overflow-auto">
          <Link
            href="/tv-shows"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 whitespace-nowrap"
          >
            TV Shows
          </Link>
          <span className="text-zinc-400">/</span>
          <Link
            href={`/tv-shows/${id}`}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 whitespace-nowrap"
          >
            {episode.season.tvShow.title}
          </Link>
          <span className="text-zinc-400">/</span>
          <Link
            href={`/tv-shows/${id}/seasons/${seasonId}`}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 whitespace-nowrap"
          >
            Season {episode.season.seasonNumber}
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
            Episode {episode.episodeNumber}
          </span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-black dark:text-white">
                E{String(episode.episodeNumber).padStart(2, "0")}: {episode.title || "Untitled"}
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-2">
                {episode.season.tvShow.title} • Season {episode.season.seasonNumber}
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
                episode.status
              )}`}
            >
              {episode.status}
            </span>
          </div>

          {episode.notes && (
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl">
              {episode.notes}
            </p>
          )}
        </div>

        {/* Files Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-black dark:text-white mb-4">
            Files ({episode.files.length})
          </h2>

          {episode.files.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-8 text-center">
              <p className="text-zinc-500 dark:text-zinc-400">
                No files found for this episode.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {episode.files.map((file) => (
                <div
                  key={file.id}
                  className="bg-white dark:bg-zinc-900 rounded-lg p-6"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-black dark:text-white break-all">
                      {file.filename}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 break-all">
                      {file.filepath}
                    </p>
                  </div>

                  {/* Quality Info */}
                  {(file.resolution ||
                    file.codec ||
                    file.bitrate ||
                    file.hdrType) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                      {file.resolution && (
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                          <p className="text-zinc-600 dark:text-zinc-400">
                            Resolution
                          </p>
                          <p className="font-semibold text-black dark:text-white">
                            {file.resolution}
                          </p>
                        </div>
                      )}
                      {file.codec && (
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                          <p className="text-zinc-600 dark:text-zinc-400">
                            Codec
                          </p>
                          <p className="font-semibold text-black dark:text-white">
                            {file.codec}
                          </p>
                        </div>
                      )}
                      {file.bitrate && (
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                          <p className="text-zinc-600 dark:text-zinc-400">
                            Bitrate
                          </p>
                          <p className="font-semibold text-black dark:text-white">
                            {file.bitrate} kbps
                          </p>
                        </div>
                      )}
                      {file.hdrType && (
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
                          <p className="text-zinc-600 dark:text-zinc-400">
                            HDR
                          </p>
                          <p className="font-semibold text-black dark:text-white">
                            {file.hdrType}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status and Metadata */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
                    <div>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Status
                      </p>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusColor(
                          file.status
                        )}`}
                      >
                        {file.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Action
                      </p>
                      <p className="font-semibold text-black dark:text-white">
                        {file.action}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Arr Status
                      </p>
                      <p className="font-semibold text-black dark:text-white">
                        {file.arrStatus}
                      </p>
                    </div>
                  </div>

                  {/* Compatibility Tests */}
                  {file.compatibilityTests.length > 0 && (
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        Compatibility Tests
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {file.compatibilityTests.map((test) => (
                          <span
                            key={test.id}
                            className={`px-2 py-1 rounded text-xs font-medium ${getTestStatusColor(
                              test.status
                            )}`}
                          >
                            {test.platform}: {test.status}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
