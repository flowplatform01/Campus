import { ReactNode, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnboardingModal } from './OnboardingModal';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { isCampusMode } = useMode();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <OnboardingModal />
      
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
                <div>
                  <h2 className="text-lg font-semibold">Welcome back, {user?.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                    <ModeIndicator />
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
                
                <ModeSwitcher />
                <ThemeToggle />

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => setLocation('/notifications')}
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarFallback>{user?.avatar || user?.name?.charAt(0)}</AvatarFallback>
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
