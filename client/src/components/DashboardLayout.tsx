import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from './ThemeToggle';
import { ModeSwitcher } from './ModeSwitcher';
import { ModeIndicator } from './ModeIndicator';
import { DynamicSidebar } from './DynamicSidebar';
import { BottomNavigation } from './BottomNavigation';
import {
  LogOut,
  Bell,
  Menu,
  X,
  Trophy,
  UserCircle,
  Wifi,
  WifiOff,
  LifeBuoy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingModal } from './OnboardingModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { isCampusMode, isSocialMode } = useMode();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showSocialComingSoon, setShowSocialComingSoon] = useState(false);

  const { data: unread } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => requestUnreadCount(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = (unread as any)?.count ?? 0;

  async function requestUnreadCount() {
    return api.notifications.unreadCount();
  }

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isSocialMode) return;
    const key = 'campus_social_coming_soon_dismissed';
    const dismissed = sessionStorage.getItem(key);
    if (dismissed === '1') return;
    setShowSocialComingSoon(true);
  }, [isSocialMode]);

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <OnboardingModal />

      <AnimatePresence>
        {isSocialMode && showSocialComingSoon && (
          <motion.div
            key="social-coming-soon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60]"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.99 }}
                className="w-full max-w-lg rounded-xl border bg-background/95 shadow-2xl"
              >
                <div className="p-6">
                  <h2 className="text-2xl font-semibold">Stay Tuned!</h2>
                  <p className="mt-2 text-muted-foreground">
                    Social Features Coming Soon.
                  </p>
                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <Button
                      className="w-full"
                      onClick={() => {
                        sessionStorage.setItem('campus_social_coming_soon_dismissed', '1');
                        setShowSocialComingSoon(false);
                      }}
                    >
                      Continue
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        sessionStorage.setItem('campus_social_coming_soon_dismissed', '1');
                        setShowSocialComingSoon(false);
                        setLocation(`/dashboard/${user?.role || 'student'}`);
                      }}
                    >
                      Back to Campus
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="lg:flex">
        <AnimatePresence>
          {(sidebarOpen || window.innerWidth >= 1024) && isCampusMode && (
            <>
              {/* Mobile backdrop overlay */}
              {sidebarOpen && window.innerWidth < 1024 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r lg:static lg:z-0"
              >
                <div className="flex items-center justify-end p-2 lg:hidden relative z-50">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                    className="touch-manipulation"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <DynamicSidebar />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                {isCampusMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                )}
                <div className="flex items-center gap-3">
                  <img src="/brand-icon.svg" alt="Campus" className="h-9 w-9" />
                  <div>
                  <h2 className="text-lg font-semibold">Welcome back, {user?.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                    <ModeIndicator />
                  </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {user?.role === 'student' && user?.points !== undefined && (
                  <Badge variant="secondary" className="hidden sm:flex">
                    <Trophy className="w-3 h-3 mr-1" />
                    {user.points} points
                  </Badge>
                )}

                <div className="flex items-center gap-1" title={isOnline ? 'Online' : 'Offline'}>
                  {isOnline ? (
                    <Wifi className="h-4 w-4 text-emerald-500 animate-pulse" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500 animate-pulse" />
                  )}
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                </div>
                
                <ModeSwitcher />
                <ThemeToggle />

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => setLocation('/notifications')}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarImage src={user?.avatar || undefined} />
                        <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation('/profile')}>
                      <UserCircle className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation('/get-in-touch')}>
                      <LifeBuoy className="w-4 h-4 mr-2" />
                      Get In Touch
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
