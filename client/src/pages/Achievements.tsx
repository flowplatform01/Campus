import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Award, Target, TrendingUp, Plus, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function Achievements() {
  const { user } = useRequireAuth(['student']);
  const [userBadges, setUserBadges] = useState(user?.badges || []);
  const [userPoints, setUserPoints] = useState((user as any)?.points || 0);
  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    points: 0,
    badgeId: '',
    type: 'academic'
  });

  const nextLevelPoints = 1500;
  const pointsProgress = (userPoints / nextLevelPoints) * 100;

  // Mock achievements data
  const availableAchievements = [
    { id: 'perfect_attendance', title: 'Perfect Attendance', description: 'No absences for a month', points: 50, badgeId: 'perfect_attendance', type: 'attendance' },
    { id: 'honor_roll', title: 'Honor Roll', description: 'Named to honor roll', points: 100, badgeId: 'honor_roll', type: 'academic' },
    { id: 'top_student', title: 'Top Student', description: 'Highest GPA in class', points: 75, badgeId: 'top_student', type: 'academic' },
    { id: 'subject_master', title: 'Subject Master', description: 'Perfect scores in 3+ subjects', points: 150, badgeId: 'subject_master', type: 'academic' },
    { id: 'leadership', title: 'Leadership', description: 'Demonstrated leadership', points: 125, badgeId: 'leadership', type: 'leadership' },
    { id: 'sports_champion', title: 'Sports Champion', description: 'Won 3+ sports competitions', points: 200, badgeId: 'sports_champion', type: 'sports' },
    { id: 'creativity_award', title: 'Creativity Award', description: 'Outstanding creative project', points: 300, badgeId: 'creativity_award', type: 'creative' },
    { id: 'community_service', title: 'Community Service', description: '50+ hours community service', points: 100, badgeId: 'community_service', type: 'service' },
    { id: 'perfect_exam', title: 'Perfect Exam Score', description: '100% on final exams', points: 100, badgeId: 'perfect_exam', type: 'academic' }
  ];

  const { toast } = useToast();
  const { data: achievementsData, isLoading: achievementsLoading } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      const r = await fetch(`/api/sms/achievements`);
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
  });

  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      const r = await fetch(`/api/user-stats/${user?.id}`);
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!user?.id,
  });

  const achievementsList = Array.isArray(achievementsData) ? achievementsData : [];
  const allAchievements = [...availableAchievements, ...achievementsList];

  const createAchievement = useMutation({
    mutationFn: (achievement: { title: string; description: string; points: number; badgeId: string; type: string }) =>
      fetch('/api/sms/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('campus_access_token')}` },
        body: JSON.stringify({ ...achievement }),
      }),
    onSuccess: async () => {
      setNewAchievement({ title: '', description: '', points: 0, badgeId: '', type: 'academic' });
      setUserBadges([...userBadges, newAchievement.badgeId || newAchievement.title]);
      setUserPoints(userPoints + newAchievement.points);
      toast({ title: 'Achievement unlocked!', description: `You've earned ${newAchievement.points} points and the "${newAchievement.title}" badge!` });
    },
    onError: (e: unknown) => {
      toast({ title: 'Failed to unlock achievement', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    },
  });

  const leaderboard = [
    { rank: 1, name: 'Emma Wilson', points: 1850, avatar: '👩' },
    { rank: 2, name: 'Alice Johnson', points: 1250, avatar: '👧' },
    { rank: 3, name: 'David Chen', points: 1100, avatar: '👦' },
    { rank: 4, name: 'Sarah Brown', points: 980, avatar: '👱‍♀️' },
    { rank: 5, name: 'Mike Johnson', points: 850, avatar: '👨' }
  ];

  const currentUserRank = leaderboard.findIndex(l => l.name === user?.name) + 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <img src="/brand-icon.svg" alt="Campus" className="h-10 w-10" />
          <div>
            <h1 className="text-3xl font-bold">Achievements & Rewards</h1>
            <p className="text-muted-foreground">Track your progress and earn rewards</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Your Points
              </CardTitle>
              <CardDescription>Keep earning to unlock rewards!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold text-center">{userPoints}</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress to next level</span>
                  <span className="font-semibold">{Math.round(pointsProgress)}%</span>
                </div>
                <Progress value={pointsProgress} />
                <p className="text-xs text-muted-foreground text-center">
                  {nextLevelPoints - userPoints} points to Level 2
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Your Rank
              </CardTitle>
              <CardDescription>Your position in the class</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold">
                  #{currentUserRank || 2}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Out of {leaderboard.length} students
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">+2 positions this week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-500" />
              Your Badges
            </CardTitle>
            <CardDescription>Achievements you've unlocked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {allAchievements.map((badge: { id: string; title: string; description: string; points: number; badgeId: string; type: string }, index: number) => {
                const earned = Array.isArray(userBadges) ? (userBadges as string[]).includes(badge.id) || (userBadges as string[]).includes(badge.badgeId) : false;
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div
                      className={`p-4 border rounded-lg text-center transition-all ${
                        earned
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-500'
                          : 'opacity-50 grayscale'
                      }`}
                    >
                      <div className="text-4xl mb-2">🏅</div>
                      <p className="text-sm font-semibold">{badge.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                      {earned && (
                        <Badge variant="secondary" className="mt-2">
                          Earned
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Class Leaderboard</CardTitle>
            <CardDescription>Top performers this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaderboard.map((student, index) => {
                const isCurrentUser = student.name === user?.name;
                return (
                  <motion.div
                    key={student.rank}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-4 p-3 rounded-lg border ${
                      isCurrentUser ? 'bg-primary/10 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold">
                      {student.rank}
                    </div>
                    <div className="text-3xl">{student.avatar}</div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {student.name}
                        {isCurrentUser && (
                          <Badge variant="secondary" className="ml-2">
                            You
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{student.points} points</p>
                    </div>
                    {student.rank <= 3 && (
                      <Trophy
                        className={`w-6 h-6 ${
                          student.rank === 1
                            ? 'text-yellow-500'
                            : student.rank === 2
                            ? 'text-gray-400'
                            : 'text-orange-600'
                        }`}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
