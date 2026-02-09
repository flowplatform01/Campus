import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { GradesChart } from '@/components/academics/GradesChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, GraduationCap } from 'lucide-react';

export default function CampusAcademicsPage() {
  useRequireAuth();
  const { user } = useAuth();

  const { data: grades } = useQuery({
    queryKey: ['grades', user?.id],
    queryFn: () => api.grades.getByStudent(user?.id),
    enabled: !!user?.id,
  });

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.exams.list(),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Academics</h1>
            <p className="text-muted-foreground">Grades, exams, and academic records</p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <GraduationCap className="w-4 h-4 mr-2" />
                Promote Students
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Exam
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="grades">
          <TabsList>
            <TabsTrigger value="grades">Grades</TabsTrigger>
            <TabsTrigger value="exams">Exams</TabsTrigger>
            {user?.role === 'admin' && <TabsTrigger value="promotions">Promotions</TabsTrigger>}
          </TabsList>

          <TabsContent value="grades" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Grades Overview</CardTitle>
                <CardDescription>{grades && grades.length > 0 ? 'Your latest performance trend' : 'No grades available yet'}</CardDescription>
              </CardHeader>
              <CardContent>
                {grades && grades.length > 0 ? <GradesChart data={grades} /> : <div className="text-sm text-muted-foreground">No data</div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(exams || []).map((exam) => (
                <Card key={exam.id}>
                  <CardHeader>
                    <CardTitle>{exam.name}</CardTitle>
                    <CardDescription>{exam.type.toUpperCase()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      <p>Status: <span className="capitalize font-medium">{exam.status}</span></p>
                      <p>Start: {exam.startDate ? new Date(exam.startDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(exams || []).length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center col-span-full">No exams scheduled</p>
              )}
            </div>
          </TabsContent>

          {user?.role === 'admin' && (
            <TabsContent value="promotions" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Student Promotion</CardTitle>
                  <CardDescription>Promote students to the next academic year and class</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Select current and target academic years/classes to begin promotion.</p>
                  <Button className="mt-4" variant="outline">Start Promotion Wizard</Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
