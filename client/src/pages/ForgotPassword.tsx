import { useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSent(true);
      toast({
        title: 'Email sent',
        description: 'If an account exists, you will receive a reset link.'
      });
    } catch {
      toast({
        title: 'Request failed',
        description: 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <img src="/brand-icon.svg" alt="Campus" className="h-12 w-12" />
            </div>
            <h1 className="text-xl font-bold">Check your email</h1>
            <p className="text-sm text-muted-foreground">
              If an account exists for {email}, you will receive a password reset link and a reset code shortly.
            </p>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/reset-password')} className="w-full mb-2">
              Enter Reset Code
            </Button>
            <Button onClick={() => setLocation('/')} variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
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
          <h1 className="text-xl font-bold">Forgot Password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@campus.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setLocation('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
