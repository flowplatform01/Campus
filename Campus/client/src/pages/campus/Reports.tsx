import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CampusReportsPage() {
  useRequireAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['sms-reports-summary'],
    queryFn: api.sms.reports.summary,
  });

  const cards = data?.cards || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analytics and summaries</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>{isLoading ? 'Loading...' : 'Active enrollments'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{cards.students ?? '0'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>Staff accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{cards.employees ?? '0'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending Admissions</CardTitle>
              <CardDescription>Awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{cards.pendingAdmissions ?? '0'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Assignments created</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{cards.assignments ?? '0'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Attendance (Locked)</CardTitle>
              <CardDescription>Locked attendance sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{cards.attendanceLockedSessions ?? '0'}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
