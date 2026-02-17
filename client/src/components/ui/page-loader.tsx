import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  className?: string;
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function PageLoader({ className, message, size = "md" }: PageLoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Loader2 className={cn("animate-spin", sizeClasses[size])} />
        {message && <span className="text-sm">{message}</span>}
      </div>
    </div>
  );
}
