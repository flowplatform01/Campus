import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  avatar: string;
  rank: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { id: '1', name: 'Alice Johnson', points: 1250, avatar: '👧', rank: 1 },
  { id: '2', name: 'Bob Smith', points: 1180, avatar: '👦', rank: 2 },
  { id: '3', name: 'Carol White', points: 1150, avatar: '👩', rank: 3 },
  { id: '4', name: 'David Brown', points: 1100, avatar: '👨', rank: 4 },
  { id: '5', name: 'Emma Davis', points: 1050, avatar: '👧', rank: 5 }
];

export function Leaderboard() {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">#{rank}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Leaderboard
        </CardTitle>
        <CardDescription>Top performers this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockLeaderboard.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                {getRankIcon(entry.rank)}
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{entry.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{entry.name}</p>
                  <p className="text-sm text-muted-foreground">{entry.points} points</p>
                </div>
              </div>
              {entry.rank <= 3 && (
                <Badge variant={entry.rank === 1 ? 'default' : 'secondary'}>
                  Top {entry.rank}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
