import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Globe, Compass, Users, MessageCircle } from 'lucide-react';

export function SocialSubNav() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { icon: Globe, label: 'Feed', path: '/dashboard/social' },
    { icon: Compass, label: 'Explore', path: '/social/explore' },
    { icon: Users, label: 'Communities', path: '/social/communities' },
    { icon: MessageCircle, label: 'Chats', path: '/social/chats' }
  ];

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-1 px-4 max-w-6xl mx-auto overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap",
                isActive
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
