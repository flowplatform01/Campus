import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { GraduationCap, Users, BookOpen, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();

  const pendingIdToken = sessionStorage.getItem('pending_google_id_token');

  const completeGoogle = async (role: 'admin' | 'student' | 'parent' | 'employee') => {
    if (!pendingIdToken) return;
    try {
      const result = await loginWithGoogle(pendingIdToken, role as any);
      if (result.status === 'logged_in') {
        sessionStorage.removeItem('pending_google_id_token');
        sessionStorage.removeItem('pending_google_profile');
        toast({ title: 'Welcome!', description: 'Account created and signed in' });
        setLocation('/');
      }
    } catch (e: any) {
      toast({ title: 'Google signup failed', description: e?.message || 'Error', variant: 'destructive' });
    }
  };

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access grades, assignments, and connect with peers',
      icon: GraduationCap,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'parent',
      title: 'Parent/Guardian',
      description: 'Monitor your child\'s progress and communicate with teachers',
      icon: Users,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'employee',
      title: 'Employee',
      description: 'Access your role-based features and manage your responsibilities',
      icon: BookOpen,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'admin',
      title: 'School Admin',
      description: 'Complete school management and oversight',
      icon: Shield,
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-4">
            <img src="/brand-icon.svg" alt="Campus" className="h-14 w-14" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Welcome to Campus
          </h1>
          <p className="text-lg text-muted-foreground">
            Select your role to get started
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role, index) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 group">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{role.title}</CardTitle>
                    <CardDescription className="text-base">
                      {role.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          if (pendingIdToken) {
                            completeGoogle(role.id as any);
                            return;
                          }
                          setLocation(`/register?role=${role.id}`);
                        }}
                        className="flex-1"
                        variant="default"
                      >
                        {pendingIdToken ? 'Continue with Google' : 'Sign Up'}
                      </Button>
                      <Button
                        onClick={() => setLocation(`/login?role=${role.id}`)}
                        className="flex-1"
                        variant="outline"
                      >
                        Login
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Already have an account?{' '}
            <Button
              variant="link"
              className="px-0 text-primary"
              onClick={() => setLocation('/login')}
            >
              Login here
            </Button>
          </p>
          <p className="text-xs text-muted-foreground">Powered by Flow • Campus Management System</p>
        </motion.div>
      </div>
    </div>
  );
}
