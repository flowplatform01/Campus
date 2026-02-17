import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, MessageCircle, Share2, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function safeOrigin() {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export default function GetInTouch() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: referralData, isLoading: referralLoading } = useQuery({
    queryKey: ['referrals-me'],
    queryFn: api.referrals.me,
    enabled: !!user,
  });

  const referralCode = referralData?.referralCode ?? (user ? `CAMPUS-${(user.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}` : '');
  const referralCount = referralData?.referralCount ?? 0;

  const referralLink = useMemo(() => {
    return `${safeOrigin()}/?ref=${encodeURIComponent(referralCode)}`;
  }, [referralCode]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy referral link', variant: 'destructive' });
    }
  };

  const shareWhatsApp = () => {
    const msg = `Hi! Join Campus with my link: ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openSupportWhatsApp = () => {
    const url = 'https://wa.me/237651632823?text=Hello%20I%20need%20support%20from%20App%20Academy';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openChannel = () => {
    const url = 'https://whatsapp.com/channel/0029Vb7N0cBC1Fu9Uk57wv1I';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold">Get In Touch</h1>
          <p className="text-muted-foreground">Referrals, support and official updates</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Referrals / Invites
            </CardTitle>
            <CardDescription>Invite others to Campus using your unique referral link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Your referral link</div>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly />
                <Button onClick={copyLink} size="icon" variant="outline" aria-label="Copy referral link">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button onClick={shareWhatsApp} variant="outline" className="w-full">
                <MessageCircle className="w-4 h-4 mr-2" />
                Share via WhatsApp
              </Button>
              <Button variant="outline" className="w-full" disabled tabIndex={-1}>
                <Users className="w-4 h-4 mr-2" />
                {referralLoading ? '...' : `${referralCount} Referred`}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Support
            </CardTitle>
            <CardDescription>Contact support directly on WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openSupportWhatsApp} className="w-full">
              Open WhatsApp Support
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Channel</CardTitle>
            <CardDescription>Get updates and announcements from our official WhatsApp channel</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={openChannel} variant="outline" className="w-full">
              Open WhatsApp Channel
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
