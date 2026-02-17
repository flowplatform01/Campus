import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    api.auth.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <img src="/brand-icon.svg" alt="Campus" className="h-12 w-12" />
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p>Verifying your email...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-2">
              <img src="/brand-icon.svg" alt="Campus" className="h-12 w-12" />
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <h1 className="text-xl font-bold">Email Verified!</h1>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Your email has been verified. You can now log in.</p>
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
          <h1 className="text-xl font-bold text-destructive">Verification Failed</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>The verification link may have expired or is invalid.</p>
          <Button onClick={() => setLocation('/')} variant="outline" className="w-full">
            Go to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
