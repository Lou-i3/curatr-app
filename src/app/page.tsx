import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tv, Film, FileVideo, ScanSearch, ArrowRight } from "lucide-react";
import { PageHeader } from '@/components/page-header';

async function getStats() {
  const [showCount, episodeCount, fileCount, recentScans] = await Promise.all([
    prisma.tVShow.count(),
    prisma.episode.count(),
    prisma.episodeFile.count(),
    prisma.scanHistory.findMany({
      orderBy: { startedAt: 'desc' },
      take: 3,
    }),
  ]);

  return { showCount, episodeCount, fileCount, recentScans };
}

export default async function Home() {
  const { showCount, episodeCount, fileCount, recentScans } = await getStats();

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your media library"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">TV Shows</CardTitle>
            <Tv className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{showCount}</div>
            <p className="text-xs text-muted-foreground">shows in library</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Episodes</CardTitle>
            <Film className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{episodeCount}</div>
            <p className="text-xs text-muted-foreground">total episodes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Media Files</CardTitle>
            <FileVideo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fileCount}</div>
            <p className="text-xs text-muted-foreground">files tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/tv-shows">
                Browse TV Shows
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/scans">
                <span className="flex items-center gap-2">
                  <ScanSearch className="h-4 w-4" />
                  Scan Library
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Latest scan activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentScans.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scans yet</p>
            ) : (
              <ul className="space-y-2">
                {recentScans.map((scan) => (
                  <li key={scan.id} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{scan.scanType} scan</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      scan.status === 'COMPLETED' ? 'bg-success text-success-foreground' :
                      scan.status === 'FAILED' ? 'bg-destructive text-destructive-foreground' :
                      scan.status === 'RUNNING' ? 'bg-secondary text-secondary-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {scan.status.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
