import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, Copy, Share2, Gift } from 'lucide-react';

export function ReferralSystem() {
  const [referralCode] = useState('CAMPUS-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const { toast } = useToast();

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: 'Copied!',
      description: 'Referral code copied to clipboard'
    });
  };

  const shareReferral = () => {
    toast({
      title: 'Share Feature',
      description: 'Share via social media (mock)'
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Invite Friends
        </CardTitle>
        <CardDescription>Earn 100 points for each friend who joins!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={referralCode} readOnly className="font-mono" />
          <Button onClick={copyReferralCode} size="icon" variant="outline">
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={shareReferral} variant="outline" className="w-full">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" className="w-full">
            <Users className="w-4 h-4 mr-2" />
            3 Invited
          </Button>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg">
          <p className="text-sm font-medium">Your Rewards</p>
          <p className="text-xs text-muted-foreground mt-1">
            You've earned 300 points from 3 successful referrals!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
