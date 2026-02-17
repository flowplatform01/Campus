import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  variant?: "default" | "card" | "text" | "avatar";
}

export function LoadingSkeleton({ className, variant = "default" }: LoadingSkeletonProps) {
  if (variant === "card") {
    return (
      <div className={cn("rounded-lg border bg-card p-6 space-y-4", className)}>
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex justify-end">
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (variant === "avatar") {
    return (
      <div className={cn("h-10 w-10 animate-pulse rounded-full bg-muted", className)} />
    );
  }

  return (
    <div className={cn("h-4 w-full animate-pulse rounded bg-muted", className)} />
  );
}
