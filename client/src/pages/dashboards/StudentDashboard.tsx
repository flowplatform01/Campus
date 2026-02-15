import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Clock, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { BadgeDisplay } from '@/components/gamification/BadgeDisplay';
import { Leaderboard } from '@/components/gamification/Leaderboard';
import { ReferralSystem } from '@/components/gamification/ReferralSystem';
import { GradesChart } from '@/components/academics/GradesChart';
import { useMemo } from 'react';

type Grade = {
  id: string;
  subject: string;
  term: string;
  score: number;
  maxScore: number;
};

type Assignment = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  submitted: boolean;
};

export default function StudentDashboard() {
  const { user } = useRequireAuth(['student']);

  const { data: smsDash } = useQuery({
    queryKey: ['sms-dashboard'],
    queryFn: api.sms.dashboard.get,
  });

  const { data: week } = useQuery({
    queryKey: ['sms-timetable-week', 'student'],
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

  const { data: grades = [] } = useQuery<Grade[]>({
    queryKey: ['grades', user?.id],
    queryFn: () => api.grades.getByStudent(user?.id) as Promise<Grade[]>,
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: ['assignments'],
    queryFn: () => api.assignments.getAll() as Promise<Assignment[]>
  });

  const averageGrade = grades.length > 0 
    ? grades.reduce((acc: number, g: Grade) => acc + (g.score / g.maxScore) * 100, 0) / grades.length
    : 0;
  const pendingAssignments = assignments.filter((a) => !a.submitted).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground">Track your academic progress</p>
          </div>

          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-2xl font-bold">{user?.points || 0}</span>
            <span className="text-sm text-muted-foreground">points</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Today's Timetable</CardTitle>
              <CardDescription>Your scheduled classes today</CardDescription>
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
              <CardDescription>Latest updates from your school</CardDescription>
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
                <Progress value={averageGrade} className="mt-2" />
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
                <CardTitle className="text-sm font-medium">Pending Assignments</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingAssignments}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {pendingAssignments > 0 ? 'Complete them soon!' : 'All caught up!'}
                </p>
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
                <CardTitle className="text-sm font-medium">Achievements</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{user?.badges?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-2">Badges earned</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {grades.length > 0 && (
          <GradesChart data={grades} />
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Grades</CardTitle>
              <CardDescription>Your latest test scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {grades.slice(0, 4).map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{grade.subject}</p>
                      <p className="text-xs text-muted-foreground">{grade.term}</p>
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
              <CardTitle>Upcoming Assignments</CardTitle>
              <CardDescription>Don't miss these deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignments.slice(0, 4).map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">{assignment.subject}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={assignment.submitted ? 'default' : 'secondary'}>
                        {assignment.submitted ? 'Submitted' : 'Pending'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Leaderboard />
          <ReferralSystem />
        </div>

        <BadgeDisplay userBadges={user?.badges || []} />
      </div>
    </DashboardLayout>
  );
}
