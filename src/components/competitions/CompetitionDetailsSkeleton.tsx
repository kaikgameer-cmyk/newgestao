import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CompetitionDetailsSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Meta de Receita */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-28" />
            </div>
          </CardHeader>
        </Card>

        {/* Prêmio */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-16 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
        </Card>

        {/* Período */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>

        {/* Código */}
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-14 mb-2" />
            <Skeleton className="h-6 w-24 font-mono" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-3 w-40" />
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Skeleton */}
      <LeaderboardSkeleton />

      {/* Daily Scores Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions Skeleton */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Tab List */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-40 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>

      {/* Ranking Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Ranking Items */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
            >
              {/* Rank Icon */}
              <Skeleton className="h-8 w-8 rounded-full" />
              {/* Name and Info */}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              {/* Score */}
              <div className="text-right space-y-2">
                <Skeleton className="h-6 w-20 ml-auto" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
