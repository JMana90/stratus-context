
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LoadingSkeletonProps {
  lines?: number;
  showHeader?: boolean;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, showHeader = true, className = "" }: LoadingSkeletonProps) {
  return (
    <Card className={`bg-card border-border ${className}`}>
      {showHeader && (
        <CardHeader>
          <div className="h-6 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`h-4 bg-muted rounded animate-pulse ${
                i === lines - 1 ? 'w-1/2' : 'w-full'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top Row - Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LoadingSkeleton lines={2} />
        <LoadingSkeleton lines={2} />
        <LoadingSkeleton lines={2} />
      </div>
      
      {/* Timeline Chart */}
      <LoadingSkeleton lines={5} className="h-64" />
      
      {/* Gantt Chart */}
      <LoadingSkeleton lines={6} className="h-80" />
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton lines={4} />
          <LoadingSkeleton lines={4} />
          <LoadingSkeleton lines={4} />
          <LoadingSkeleton lines={4} />
        </div>
        <div className="space-y-6">
          <LoadingSkeleton lines={5} />
          <LoadingSkeleton lines={3} />
        </div>
      </div>
    </div>
  );
}
