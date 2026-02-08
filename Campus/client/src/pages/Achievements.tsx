import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { badges } from '@/data-access/mockData';
import { Trophy, Award, Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Achievements() {
  const { user } = useRequireAuth(['student']);

  const userBadges = user?.badges || [];
  const userPoints = (user as any)?.points || 0;

  const nextLevelPoints = 1500;
  const pointsProgress = (userPoints / nextLevelPoints) * 100;

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
        <div>
          <h1 className="text-3xl font-bold">Achievements & Rewards</h1>
          <p className="text-muted-foreground">Track your progress and earn rewards</p>
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
              {badges.map((badge, index) => {
                const earned = userBadges.includes(badge.id);
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
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <p className="text-sm font-semibold">{badge.name}</p>
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
