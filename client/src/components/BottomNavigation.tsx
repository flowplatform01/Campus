import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { cn } from '@/lib/utils';
import { Home, BookOpen, MessageCircle, Users, Plus, Building2, Globe, User, Settings } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function BottomNavigation() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { isCampusMode, setMode } = useMode();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  if (!user) return null;

  const campusNavItems = [
    { icon: Home, label: 'Home', path: `/dashboard/${user.role}` },
    { icon: BookOpen, label: 'Academics', path: '/campus/academics' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' }
  ];

  const socialNavItems = [
    { icon: Globe, label: 'Feed', path: '/dashboard/social' },
    { icon: MessageCircle, label: 'Chats', path: '/social/chats' },
    { icon: Plus, label: 'Post', action: 'post' },
    { icon: Users, label: 'Connect', path: '/social/communities' },
    { icon: Building2, label: 'Campus', action: 'switchToCampus' }
  ];

  const navItems = isCampusMode ? campusNavItems : socialNavItems;

  const handleItemClick = (item: any) => {
    if (item.action === 'post') {
      setLocation('/dashboard/social');
      setTimeout(() => {
        const createButton = document.querySelector('[data-create-post-button]') as HTMLElement;
        createButton?.click();
      }, 100);
    } else if (item.action === 'switchToCampus') {
      setMode('campus');
      setLocation(`/dashboard/${user.role}`);
    } else {
      setLocation(item.path);
    }
  };

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    )}>
      <div className="flex items-center justify-around h-16 px-2 max-w-7xl mx-auto">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          const isPostButton = (item as any).action === 'post';
          
          return (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all relative",
                isPostButton && isCampusMode === false
                  ? "text-white"
                  : isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isPostButton && !isCampusMode ? (
                <div className="absolute -top-6 bg-primary rounded-full p-4 shadow-lg hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              ) : (
                <>
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </>
              )}
            </button>
          );
        })}
        
        {isCampusMode && (
          <button
            onClick={() => {
              setMode('social');
              setLocation('/dashboard/social');
            }}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Switch to Social mode"
          >
            <Globe className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Social</span>
          </button>
        )}
      </div>
    </nav>
  );
}
