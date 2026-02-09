import { useMode } from '@/contexts/ModeContext';
import { Button } from '@/components/ui/button';
import { Building2, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export function ModeSwitcher() {
  const { mode, toggleMode } = useMode();

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMode}
        className="relative flex items-center gap-2 transition-all"
        aria-label={`Switch to ${mode === 'campus' ? 'Social' : 'Campus'} mode`}
      >
        {mode === 'campus' ? (
          <>
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Campus</span>
          </>
        ) : (
          <>
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Social</span>
          </>
        )}
      </Button>
    </motion.div>
  );
}
