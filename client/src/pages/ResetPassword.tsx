import { useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const effectiveToken = (token || code || '').trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveToken) {
      toast({ title: 'Missing reset code', description: 'Enter the reset code from your email', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Use at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword(effectiveToken, password);
      setDone(true);
      toast({ title: 'Password reset', description: 'You can now log in with your new password' });
    } catch {
      toast({ title: 'Reset failed', description: 'The link may have expired', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <img src="/brand-icon.svg" alt="Campus" className="h-12 w-12" />
            </div>
            <h1 className="text-xl font-bold">Password Reset!</h1>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Your password has been reset. Log in with your new password.</p>
            <Button onClick={() => setLocation('/')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <img src="/brand-icon.svg" alt="Campus" className="h-12 w-12" />
          </div>
          <h1 className="text-xl font-bold">Reset Password</h1>
          <p className="text-sm text-muted-foreground">Enter your reset code (if needed) and your new password.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!token && (
              <div className="space-y-2">
                <Label htmlFor="code">Reset Code</Label>
                <Input
                  id="code"
                  placeholder="Enter the code from your email"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
