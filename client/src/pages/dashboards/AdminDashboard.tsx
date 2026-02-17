import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Users, GraduationCap, DollarSign, TrendingUp, Wallet, ClipboardCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  useRequireAuth(['admin']);
  const [, setLocation] = useLocation();

  const { data } = useQuery({
    queryKey: ['sms-dashboard'],
    queryFn: api.sms.dashboard.get,
  });

  const alerts = (data?.alerts || []) as Array<{ type: string; message: string; count?: number; actionUrl?: string }>;

  const stats = [
    {
      title: 'Total Students',
      value: String(data?.cards?.students ?? 0),
      icon: Users,
      change: '',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Total Employees',
      value: String(data?.cards?.employees ?? 0),
      icon: GraduationCap,
      change: '',
      color: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Pending Admissions',
      value: String(data?.cards?.pendingAdmissions ?? 0),
      icon: TrendingUp,
      change: '',
      color: 'from-orange-500 to-red-500'
    },
    {
      title: 'Fee Collection',
      value: data?.cards?.feeCollection !== undefined ? `$${Number(data.cards.feeCollection).toLocaleString()}` : '—',
      icon: DollarSign,
      change: '',
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Total Expenses',
      value: data?.cards?.totalExpenses !== undefined ? `$${Number(data.cards.totalExpenses).toLocaleString()}` : '—',
      icon: Wallet,
      change: '',
      color: 'from-red-500 to-rose-500'
    },
    {
      title: 'Active Exams',
      value: String(data?.cards?.examsCount ?? 0),
      icon: ClipboardCheck,
      change: '',
      color: 'from-indigo-500 to-blue-500'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <img src="/brand-icon.svg" alt="Campus" className="h-10 w-10" />
          <div>
            <h1 className="text-3xl font-bold">School Administration</h1>
            <p className="text-muted-foreground">Manage your school from one central dashboard</p>
          </div>
        </div>

        {data && data?.setup && data.setup.hasActiveAcademicYear === false && (
          <Alert>
            <AlertDescription>
              Setup incomplete: set exactly one active academic year in School Setup.
            </AlertDescription>
          </Alert>
        )}

        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Smart Alerts
            </h3>
            <div className="flex flex-wrap gap-2">
              {alerts.map((a) => (
                <Alert key={a.type} className="flex items-center justify-between py-2">
                  <AlertDescription>{a.message}</AlertDescription>
                  {a.actionUrl && (
                    <Button variant="ghost" size="sm" onClick={() => setLocation(a.actionUrl!)}>
                      View <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </Alert>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    {stat.change && (
                      <p className="text-xs text-muted-foreground">
                        <span className="text-green-600">{stat.change}</span> from last month
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Announcements</CardTitle>
              <CardDescription>Latest announcements for the school</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data?.recentAnnouncements || []).slice(0, 4).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {(data?.recentAnnouncements || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No announcements yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>Recent administrative actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data?.recentAudit || []).map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">Session: {log.sessionId.substring(0, 8)}...</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(log.at).toLocaleDateString()}</span>
                  </div>
                ))}
                {(data?.recentAudit || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
