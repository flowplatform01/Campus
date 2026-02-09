import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { badges } from '@/data-access/mockData';
import { Trophy, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface BadgeDisplayProps {
  userBadges: string[];
}

export function BadgeDisplay({ userBadges }: BadgeDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Your Badges
        </CardTitle>
        <CardDescription>Achievements you've earned</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {badges.map((badge, index) => {
            const earned = userBadges.includes(badge.id);
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 border rounded-lg text-center ${
                  earned ? 'bg-accent/50' : 'opacity-50'
                }`}
              >
                <div className="text-4xl mb-2">
                  {earned ? badge.icon : <Lock className="w-8 h-8 mx-auto text-muted-foreground" />}
                </div>
                <h4 className="font-semibold text-sm">{badge.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                {earned && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    Earned
                  </Badge>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
