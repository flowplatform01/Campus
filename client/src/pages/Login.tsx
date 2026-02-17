import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split('?')[1]);
  const role = params.get('role');

  const googleClientId = useMemo(() => (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined, []);
  const googleDivRef = useRef<HTMLDivElement | null>(null);
  const [gisReady, setGisReady] = useState(false);

  useEffect(() => {
    if (!googleClientId) return;
    if (window.google?.accounts?.id) {
      setGisReady(true);
      return;
    }
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      const startedAt = Date.now();
      const t = window.setInterval(() => {
        if (window.google?.accounts?.id) {
          setGisReady(true);
          window.clearInterval(t);
        } else if (Date.now() - startedAt > 8000) {
          window.clearInterval(t);
        }
      }, 200);
      return () => window.clearInterval(t);
    }

    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-google-identity', '1');
    s.onload = () => setGisReady(true);
    s.onerror = () => {
      toast({ title: 'Google login unavailable', description: 'Failed to load Google script', variant: 'destructive' });
    };
    document.body.appendChild(s);
  }, [googleClientId, toast]);

  useEffect(() => {
    if (!googleClientId) return;
    if (!googleDivRef.current) return;
    if (!gisReady) return;
    if (!window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (resp: any) => {
        const credential = resp?.credential;
        if (!credential) {
          toast({ title: 'Google login failed', description: 'No credential returned', variant: 'destructive' });
          return;
        }
        try {
          const result = await loginWithGoogle(String(credential));
          if (result.status === 'needs_role_selection') {
            sessionStorage.setItem('pending_google_id_token', String(credential));
            sessionStorage.setItem('pending_google_profile', JSON.stringify(result.profile));
            setLocation('/role-selection?source=google');
            return;
          }
          toast({ title: 'Welcome back!', description: 'Successfully logged in' });
        } catch (e: any) {
          toast({ title: 'Google login failed', description: e?.message || 'Error', variant: 'destructive' });
        }
      },
    });

    googleDivRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleDivRef.current, {
      theme: 'outline',
      size: 'large',
      width: 360,
    });
  }, [gisReady, googleClientId, loginWithGoogle, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      toast({
        title: 'No internet connection',
        description: 'Please check your network and try again',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in'
        });
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password',
          variant: 'destructive'
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: 'Login failed',
        description: msg,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-950 via-indigo-950 to-violet-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.25),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(124,58,237,0.22),transparent_55%)]" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/brand-icon.svg" alt="Campus" className="h-14 w-14 drop-shadow-xl" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold text-white mb-3 drop-shadow-lg"
          >
            Welcome to Campus
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/90 text-lg"
          >
            Your all-in-one educational platform
          </motion.p>
        </div>

        <Card className="backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div ref={googleDivRef} />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@campus.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-xs"
                    onClick={() => setLocation('/forgot-password')}
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="flex flex-col gap-3 mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    New to Campus?
                  </span>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full border-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setLocation('/role-selection')}
              >
                Register Now
              </Button>

              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-xs text-muted-foreground"
                onClick={() => {
                  window.open(
                    'https://wa.me/237651632823?text=Hello%20I%20need%20support%20from%20App%20Academy',
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
              >
                Need Help? Contact Support
              </Button>
            </div>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
