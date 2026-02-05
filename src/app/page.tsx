import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl space-y-8 text-center">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tight text-black dark:text-white">
              Media Quality Tracker
            </h1>
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              Track your Plex media library quality and compatibility
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-8">
            <Link
              href="/tv-shows"
              className="inline-block rounded-lg bg-blue-600 px-8 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Browse TV Shows
            </Link>
            <Link
              href="/scans"
              className="inline-block rounded-lg bg-zinc-700 px-8 py-3 font-semibold text-white hover:bg-zinc-600 transition-colors"
            >
              Scan Library
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
