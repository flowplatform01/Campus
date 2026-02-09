import { useMode } from '@/contexts/ModeContext';
import { cn } from '@/lib/utils';

export function ModeIndicator() {
  const { mode } = useMode();

  return (
    <div className={cn(
      "px-3 py-1 rounded-full text-xs font-medium",
      mode === 'campus' 
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    )}>
      {mode === 'campus' ? '🏫 Campus Mode' : '🌐 Social Mode'}
    </div>
  );
}
