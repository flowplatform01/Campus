import { useEffect, useState } from "react";
import { Loader2, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SplashScreenProps {
  className?: string;
  message?: string;
  show?: boolean;
}

export function SplashScreen({ className, message, show = true }: SplashScreenProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => {
      setDots((prev: string) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background",
        className
      )}
    >
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Logo/Icon with subtle animation */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Campus</h1>
          <p className="text-sm text-muted-foreground">School Management System</p>
        </div>

        {/* Loading spinner with dots */}
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{message || "Loading"}{dots}</span>
        </div>

        {/* Progress bar (optional visual cue) */}
        <div className="w-48 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-3/4 animate-pulse rounded-full bg-primary transition-all duration-1000 ease-out" />
        </div>
      </div>
    </div>
  );
}

// Hook to control splash screen globally
export function useSplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [message, setMessage] = useState("Loading Campus");

  const show = (msg?: string) => {
    setMessage(msg || "Loading Campus");
    setIsVisible(true);
  };

  const hide = () => setIsVisible(false);

  return { isVisible, message, show, hide, setMessage };
}

// Page loader component for route-level loading
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
