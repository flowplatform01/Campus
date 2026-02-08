import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { GradesChart } from '@/components/academics/GradesChart';

export default function CampusAcademicsPage() {
  useRequireAuth();
  const { user } = useAuth();

  const { data: grades } = useQuery({
    queryKey: ['grades', user?.id],
    queryFn: () => api.grades.getByStudent(user?.id),
    enabled: !!user?.id,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Academics</h1>
          <p className="text-muted-foreground">Grades and academic records</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Grades Overview</CardTitle>
            <CardDescription>{grades && grades.length > 0 ? 'Your latest performance trend' : 'No grades available yet'}</CardDescription>
          </CardHeader>
          <CardContent>
            {grades && grades.length > 0 ? <GradesChart data={grades} /> : <div className="text-sm text-muted-foreground">No data</div>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
