import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/data-access/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail, Lock, User, Hash, School, UserCircle, Users, Briefcase } from 'lucide-react';

export default function Register() {
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [selectedSubRole, setSelectedSubRole] = useState<string>('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    schoolName: '',
    studentId: '',
    employeeId: ''
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    
    setLoading(true);

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: selectedRole,
        schoolName: selectedRole === 'admin' ? formData.schoolName : undefined,
        subRole: selectedRole === 'employee' && selectedSubRole ? selectedSubRole : undefined,
        studentId: selectedRole === 'student' ? formData.studentId : undefined,
        employeeId: selectedRole === 'employee' ? formData.employeeId : undefined
      });

      const verificationEmailSent = (result as any)?.verificationEmailSent;
      if (verificationEmailSent === false) {
        toast({
          title: 'Account created',
          description: 'Verification email could not be sent. In development, check the server logs for the verification link.'
        });
      } else {
        toast({
          title: 'Welcome to Campus!',
          description: 'Your account has been created successfully'
        });
      }
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = (provider: string) => {
    toast({
      title: `${provider} Signup`,
      description: 'Social signup would be handled here in production'
    });
  };

  const roleOptions = [
    { value: 'admin' as UserRole, label: 'School Admin', icon: School, description: 'Manage school operations' },
    { value: 'student' as UserRole, label: 'Student', icon: UserCircle, description: 'Access student portal' },
    { value: 'parent' as UserRole, label: 'Parent/Guardian', icon: Users, description: 'Monitor student progress' },
    { value: 'employee' as UserRole, label: 'Employee', icon: Briefcase, description: 'Staff access' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {step === 'form' && (
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setStep('role')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change role
          </Button>
        )}

        <AnimatePresence mode="wait">
          {step === 'role' ? (
            <motion.div
              key="role"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-3xl font-bold text-center">Create Account</CardTitle>
                  <CardDescription className="text-center">
                    Select your role to get started
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    return (
                      <Button
                        key={role.value}
                        variant="outline"
                        className="w-full justify-start h-auto p-4"
                        onClick={() => {
                          setSelectedRole(role.value);
                          setStep('form');
                        }}
                      >
                        <Icon className="w-6 h-6 mr-3" />
                        <div className="text-left">
                          <div className="font-semibold">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </Button>
                    );
                  })}

                  <div className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{' '}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => setLocation('/')}
                      >
                        Login
                      </Button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-3xl font-bold text-center">Create Account</CardTitle>
                  <CardDescription className="text-center">
                    Sign up as {selectedRole && selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Button variant="outline" onClick={() => handleSocialSignup('Google')}>
                      G
                    </Button>
                    <Button variant="outline" onClick={() => handleSocialSignup('Facebook')}>
                      F
                    </Button>
                    <Button variant="outline" onClick={() => handleSocialSignup('Apple')}>
                      A
                    </Button>
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

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@campus.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Create a strong password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    {selectedRole === 'admin' && (
                      <div className="space-y-2">
                        <Label htmlFor="schoolName">School Name</Label>
                        <div className="relative">
                          <School className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="schoolName"
                            placeholder="My School Academy"
                            value={formData.schoolName}
                            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {selectedRole === 'student' && (
                      <div className="space-y-2">
                        <Label htmlFor="studentId">Student ID</Label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="studentId"
                            placeholder="STU001"
                            value={formData.studentId}
                            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {selectedRole === 'employee' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="subRole">Position</Label>
                          <select
                            id="subRole"
                            value={selectedSubRole}
                            onChange={(e) => setSelectedSubRole(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            required
                          >
                            <option value="">Select Position</option>
                            <option value="teacher">Teacher</option>
                            <option value="principal">Principal</option>
                            <option value="bursar">Bursar</option>
                            <option value="secretary">Secretary</option>
                            <option value="counselor">Counselor</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="employeeId">Employee ID</Label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="employeeId"
                              placeholder="EMP001"
                              value={formData.employeeId}
                              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{' '}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => setLocation('/')}
                      >
                        Login
                      </Button>
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
