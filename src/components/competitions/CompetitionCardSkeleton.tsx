import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CompetitionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            {/* Title */}
            <Skeleton className="h-6 w-3/4" />
            {/* Participants */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          {/* Status badge */}
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Description */}
        <Skeleton className="h-4 w-full" />
        
        {/* Meta and Prize */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        
        {/* Dates */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      </CardContent>
    </Card>
  );
}

interface CompetitionSkeletonGridProps {
  count?: number;
}

export function CompetitionSkeletonGrid({ count = 4 }: CompetitionSkeletonGridProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CompetitionCardSkeleton key={i} />
      ))}
    </div>
  );
}
