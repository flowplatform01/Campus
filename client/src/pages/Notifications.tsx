import { useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bell, CheckCheck, Trash2, School, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export default function Notifications() {
  const { user } = useRequireAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  type NotificationItem = {
    id: string;
    type: 'campus' | 'social' | string;
    title: string;
    message: string;
    actionUrl?: string | null;
    icon?: string | null;
    read: boolean;
    createdAt: string;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.notifications.getAll,
  });

  const notifications: NotificationItem[] = (data as any)?.notifications || [];
  const unreadCount = (data as any)?.unreadCount ?? notifications.filter((n: any) => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e: any) => toast({ description: e?.message || 'Failed to mark as read', variant: 'destructive' }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      toast({ description: 'All notifications marked as read' });
    },
    onError: (e: any) => toast({ description: e?.message || 'Failed to mark all as read', variant: 'destructive' }),
  });

  const deleteNotif = useMutation({
    mutationFn: (id: string) => api.notifications.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      toast({ description: 'Notification deleted' });
    },
    onError: (e: any) => toast({ description: e?.message || 'Failed to delete', variant: 'destructive' }),
  });

  const campusNotifications = useMemo(() => notifications.filter((n: NotificationItem) => n.type === 'campus'), [notifications]);
  const socialNotifications = useMemo(() => notifications.filter((n: NotificationItem) => n.type === 'social'), [notifications]);

  const NotificationCard = ({ notif }: { notif: NotificationItem }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
    >
      <Card className={`mb-2 ${notif.read ? 'bg-background' : 'bg-accent/50 border-primary/50'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${notif.type === 'campus' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
              {notif.icon ? (
                <span className="text-2xl">{notif.icon}</span>
              ) : (
                notif.type === 'campus' ? (
                  <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{notif.title}</p>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {notif.type === 'campus' ? 'Campus' : 'Social'}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {!notif.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead.mutate(notif.id)}
                      className="h-8"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotif.mutate(notif.id)}
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {notif.actionUrl && (
                <Button variant="link" className="h-auto p-0 mt-2" size="sm">
                  View Details →
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="default" className="h-6">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Stay updated with campus and social activities</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={() => markAllRead.mutate()} className="gap-2">
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="gap-2">
              <Bell className="w-4 h-4" />
              All
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="campus" className="gap-2">
              <School className="w-4 h-4" />
              Campus
              {campusNotifications.filter((n: NotificationItem) => !n.read).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {campusNotifications.filter((n: NotificationItem) => !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Users className="w-4 h-4" />
              Social
              {socialNotifications.filter((n: NotificationItem) => !n.read).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {socialNotifications.filter((n: NotificationItem) => !n.read).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {isLoading ? (
                <Card className="p-12">
                  <div className="text-center">
                    <p className="text-muted-foreground">Loading notifications...</p>
                  </div>
                </Card>
              ) : notifications.length > 0 ? (
                notifications.map((notif: NotificationItem) => (
                  <NotificationCard key={notif.id} notif={notif} />
                ))
              ) : (
                <Card className="p-12">
                  <div className="text-center">
                    <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No notifications yet</p>
                  </div>
                </Card>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="campus" className="mt-6">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {campusNotifications.length > 0 ? (
                campusNotifications.map((notif: NotificationItem) => (
                  <NotificationCard key={notif.id} notif={notif} />
                ))
              ) : (
                <Card className="p-12">
                  <div className="text-center">
                    <School className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No campus notifications</p>
                  </div>
                </Card>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="social" className="mt-6">
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {socialNotifications.length > 0 ? (
                socialNotifications.map((notif: NotificationItem) => (
                  <NotificationCard key={notif.id} notif={notif} />
                ))
              ) : (
                <Card className="p-12">
                  <div className="text-center">
                    <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No social notifications</p>
                  </div>
                </Card>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
