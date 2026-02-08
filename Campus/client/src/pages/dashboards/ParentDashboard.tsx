import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, TrendingUp, Calendar, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function ParentDashboard() {
  const { user } = useRequireAuth(['parent']);

  const { data: smsDash } = useQuery({
    queryKey: ['sms-dashboard'],
    queryFn: api.sms.dashboard.get,
  });

  const { data: week } = useQuery({
    queryKey: ['sms-timetable-week', 'parent'],
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
      .sort((a: any, b: any) => (a.startTime || '').localeCompare(b.startTime || ''))
      .slice(0, 5);
  }, [week, todayKey]);

  const childId = (smsDash as any)?.childId || (user as any)?.children?.[0];
  const { data: childData } = useQuery({
    queryKey: ['child', childId],
    queryFn: () => api.users.getById(childId || ''),
    enabled: !!childId
  });

  const { data: grades } = useQuery({
    queryKey: ['grades', childId],
    queryFn: () => api.grades.getByStudent(childId),
    enabled: !!childId
  });

  const { data: attendanceRows } = useQuery({
    queryKey: ['attendance', childId],
    queryFn: () => api.attendance.getByStudent(childId),
    enabled: !!childId
  });

  const attendance = ((attendanceRows as any[]) || []) as any[];

  const attendanceRate = attendance.length > 0
    ? (attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100
    : 0;

  const gradeRows = ((grades as any[]) || []) as any[];
  const averageGrade = gradeRows.length > 0
    ? gradeRows.reduce((acc: number, g: any) => acc + (g.score / g.maxScore) * 100, 0) / gradeRows.length
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Family Dashboard</h1>
          <p className="text-muted-foreground">Monitor your child's progress</p>
        </div>

        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Parent-Teacher meeting scheduled for October 10th at 3:00 PM
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Child Information</CardTitle>
            <CardDescription>Currently viewing: {childData?.name || 'No child linked'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-medium">{(childData as any)?.studentId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Grade</p>
                <p className="font-medium">{(childData as any)?.grade}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Class Section</p>
                <p className="font-medium">{(childData as any)?.classSection}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageGrade?.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+2%</span> from last term
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceRate.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Unread messages</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Grades</CardTitle>
              <CardDescription>Latest test scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gradeRows.slice(0, 4).map((grade: any) => (
                  <div key={grade.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{grade.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(grade.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={grade.score / grade.maxScore > 0.8 ? 'default' : 'secondary'}>
                      {grade.score}/{grade.maxScore}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Record</CardTitle>
              <CardDescription>Last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendance.slice(0, 7).map((att: any) => (
                  <div key={att.id} className="flex items-center justify-between">
                    <p className="text-sm">{new Date(att.date).toLocaleDateString()}</p>
                    <Badge
                      variant={
                        att.status === 'present'
                          ? 'default'
                          : att.status === 'late'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {att.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Today's Timetable</CardTitle>
              <CardDescription>What your child has today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaySlots.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{subjectNameById[s.subjectId] || 'Subject'}</p>
                      <p className="text-xs text-muted-foreground">{s.startTime} - {s.endTime}</p>
                    </div>
                    <Badge>{s.room || '—'}</Badge>
                  </div>
                ))}
                {todaySlots.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No classes scheduled for today</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Latest updates from the school</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(smsDash?.recentAnnouncements || []).slice(0, 5).map((a: any) => (
                  <div key={a.id} className="border rounded-lg p-3">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground">{a.message}</p>
                  </div>
                ))}
                {(smsDash?.recentAnnouncements || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No announcements yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
