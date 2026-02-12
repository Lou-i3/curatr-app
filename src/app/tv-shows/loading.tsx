/**
 * Loading skeleton for TV Shows page
 * Shown during navigation for instant feedback
 */

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout";

function ShowCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="w-24 h-36 sm:w-20 sm:h-30 flex-shrink-0 mx-auto sm:mx-0" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-2">
              <div className="flex-1">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <div className="flex gap-3">
              <Skeleton className="h-9 w-24 rounded" />
              <Skeleton className="h-9 w-28 rounded" />
              <Skeleton className="h-9 w-32 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TVShowsLoading() {
  return (
    <PageContainer maxWidth="wide">
      {/* Sticky Header + Toolbar skeleton — matches tv-shows/page.tsx layout */}
      <div className="sticky top-12 z-10 bg-background -mt-4 md:-mt-6 pt-4 md:pt-6 pb-4 md:pb-6 -mx-4 px-4 md:-mx-8 md:px-8 border-b mb-6 md:mb-8">
        <div className="mb-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShowCardSkeleton key={i} />
        ))}
      </div>
    </PageContainer>
  );
}
