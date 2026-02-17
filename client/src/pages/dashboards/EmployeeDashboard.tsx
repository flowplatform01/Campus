import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ClipboardCheck, BookOpen, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMemo } from 'react';

export default function EmployeeDashboard() {
  const { user } = useRequireAuth(['employee']);

  const { data } = useQuery({
    queryKey: ['sms-dashboard'],
    queryFn: api.sms.dashboard.get,
  });

  const { data: week } = useQuery({
    queryKey: ['sms-timetable-week', 'employee'],
    queryFn: () => api.sms.timetable.week(),
  });

  const { data: subjects } = useQuery({
    queryKey: ['sms-subjects'],
    queryFn: api.sms.subjects.list,
  });

  const subjectNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of subjects || []) m[s.id] = s.name;
    return m;
  }, [subjects]);

  const todayKey = useMemo(() => {
    const map = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
    return map[new Date().getDay()];
  }, []);

  const todaySlots = useMemo(() => {
    const all = week?.slots || [];
    return all
      .filter((s: any) => s.weekday === todayKey)
      .slice()
      .sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''));
  }, [week, todayKey]);

  const classes = (user as any)?.classes || [];
  const userSubjects = (user as any)?.subjects || [];

  const stats = [
    {
      title: 'Total Students',
      value: '—',
      icon: Users,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Pending Grades',
      value: '—',
      icon: ClipboardCheck,
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Active Classes',
      value: classes.length.toString(),
      icon: BookOpen,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Pending Admissions',
      value: String(data?.cards?.pendingAdmissions ?? 0),
      icon: MessageSquare,
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Employee Dashboard</h1>
          <p className="text-muted-foreground">Manage your responsibilities and tasks</p>
        </div>

        {data && data?.setup && data.setup.hasActiveAcademicYear === false && (
          <Alert>
            <AlertDescription>
              Setup incomplete: an admin must set an active academic year.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>Active classes this semester</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {classes.map((cls: string, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Class {cls}</p>
                      {userSubjects.length > 0 && (
                        <p className="text-sm text-muted-foreground">{userSubjects[i % userSubjects.length]}</p>
                      )}
                    </div>
                    <Button size="sm">View</Button>
                  </div>
                ))}
                {classes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No classes assigned yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
              <CardDescription>Your classes for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaySlots.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{subjectNameById[s.subjectId] || 'Class'}</p>
                      <p className="text-xs text-muted-foreground">{s.startTime} - {s.endTime}</p>
                    </div>
                    <Badge>{s.room || (subjectNameById[s.subjectId] || s.subjectId)}</Badge>
                  </div>
                ))}
                {todaySlots.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No classes scheduled for today
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Latest announcements for your school</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data?.recentAnnouncements || []).slice(0, 4).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {(data?.recentAnnouncements || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No announcements yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div />
        </div>
      </div>
    </DashboardLayout>
  );
}
