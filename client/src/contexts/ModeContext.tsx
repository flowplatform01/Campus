import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppMode = 'campus' | 'social';

interface ModeContextType {
  mode: AppMode;
  toggleMode: () => void;
  setMode: (mode: AppMode) => void;
  isCampusMode: boolean;
  isSocialMode: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(() => {
    const stored = localStorage.getItem('campus_app_mode');
    return (stored as AppMode) || 'campus';
  });

  useEffect(() => {
    localStorage.setItem('campus_app_mode', mode);
    
    if (mode === 'campus') {
      document.documentElement.classList.remove('social-mode');
      document.documentElement.classList.add('campus-mode');
    } else {
      document.documentElement.classList.remove('campus-mode');
      document.documentElement.classList.add('social-mode');
    }
  }, [mode]);

  const toggleMode = () => {
    setModeState(prev => prev === 'campus' ? 'social' : 'campus');
  };

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
  };

  return (
    <ModeContext.Provider
      value={{
        mode,
        toggleMode,
        setMode,
        isCampusMode: mode === 'campus',
        isSocialMode: mode === 'social'
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
}
