import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home, Users, BookOpen, Calendar, MessageSquare, Settings,
  BarChart3, DollarSign, Shield, Trophy, ClipboardList,
  Bell, FileText, GraduationCap, Briefcase, Globe,
  LayoutDashboard, UserCog, Megaphone, PieChart
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Permission } from '@/lib/permissions';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  permission?: Permission;
  badge?: string;
}

export function DynamicSidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { isCampusMode } = useMode();
  const { can } = usePermissions();

  const campusNavItems: NavItem[] = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: `/dashboard/${user?.role}`,
      permission: 'view_dashboard'
    },
    { 
      icon: Users, 
      label: 'Users', 
      path: '/campus/users',
      permission: 'manage_users'
    },
    { 
      icon: GraduationCap, 
      label: 'Academics', 
      path: '/campus/academics',
      permission: 'view_grades'
    },
    { 
      icon: ClipboardList, 
      label: 'Attendance', 
      path: '/campus/attendance',
      permission: 'view_attendance'
    },
    { 
      icon: BookOpen, 
      label: 'Assignments', 
      path: '/campus/assignments',
      permission: 'view_assignments'
    },
    { 
      icon: Calendar, 
      label: 'Schedule', 
      path: '/campus/schedule',
      permission: 'view_schedule'
    },
    { 
      icon: DollarSign, 
      label: 'Payments', 
      path: '/campus/payments',
      permission: 'view_payments'
    },
    { 
      icon: Megaphone, 
      label: 'Announcements', 
      path: '/campus/announcements',
      permission: 'view_announcements'
    },
    { 
      icon: PieChart, 
      label: 'Reports', 
      path: '/campus/reports',
      permission: 'view_reports'
    },
    { 
      icon: Briefcase, 
      label: 'Resources', 
      path: '/campus/resources',
      permission: 'manage_resources'
    },
    { 
      icon: Shield, 
      label: 'Admin', 
      path: '/campus/admin',
      permission: 'manage_school_settings'
    }
  ];

  const socialNavItems: NavItem[] = [
    { 
      icon: Globe, 
      label: 'Feed', 
      path: '/dashboard/social',
      permission: 'view_social_feed'
    },
    { 
      icon: MessageSquare, 
      label: 'Messages', 
      path: '/social/messages',
      permission: 'view_social_feed'
    },
    { 
      icon: Bell, 
      label: 'Notifications', 
      path: '/social/notifications',
      permission: 'view_announcements'
    }
  ];

  const studentSpecificItems: NavItem[] = [
    { 
      icon: Trophy, 
      label: 'Achievements', 
      path: '/dashboard/student/achievements'
    }
  ];

  let navItems = isCampusMode ? campusNavItems : socialNavItems;
  
  if (user?.role === 'student' && isCampusMode) {
    navItems = [...navItems, ...studentSpecificItems];
  }

  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    return can(item.permission);
  });

  const subRole = (user as any)?.subRole;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Campus
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isCampusMode ? 'Management System' : 'Social Network'}
        </p>
        {subRole && (
          <Badge variant="outline" className="mt-2 text-xs">
            {subRole.charAt(0).toUpperCase() + subRole.slice(1)}
          </Badge>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Button
              key={item.path}
              variant={isActive ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setLocation(item.path)}
            >
              <Icon className="w-4 h-4 mr-3" />
              {item.label}
              {item.badge && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-1">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setLocation('/profile')}
        >
          <UserCog className="w-4 h-4 mr-3" />
          Profile
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setLocation('/settings')}
        >
          <Settings className="w-4 h-4 mr-3" />
          Settings
        </Button>
      </div>
    </div>
  );
}
