import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { GradesChart } from '@/components/academics/GradesChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, GraduationCap, Book, Edit, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';

export default function CampusAcademicsPage() {
  useRequireAuth();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: grades } = useQuery({
    queryKey: ['grades', user?.id],
    queryFn: () => api.grades.getByStudent(user?.id),
    enabled: !!user?.id,
  });

  const seedSampleSubjects = useMutation({
    mutationFn: () => api.sms.subjects.seedSamples(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['subjects'] });
      await qc.invalidateQueries({ queryKey: ['sms-subjects'] });
      toast({ title: 'Sample subjects created' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.exams.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.sms.subjects.list(),
    enabled: user?.role === 'admin' || user?.role === 'employee',
  });

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
  });

  const [editingSubject, setEditingSubject] = useState<string | null>(null);

  const createSubject = useMutation({
    mutationFn: () => api.sms.subjects.create(subjectForm),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['subjects'] });
      await qc.invalidateQueries({ queryKey: ['sms-subjects'] });
      setSubjectForm({ name: '', code: '' });
      toast({ title: 'Subject created', description: 'Subject has been added successfully.' });
    },
    onError: (e: any) => {
      toast({ title: 'Failed to create subject', description: e?.message || 'Error', variant: 'destructive' });
    },
  });

  const deleteSubject = useMutation({
    mutationFn: (id: string) => api.sms.subjects.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['subjects'] });
      await qc.invalidateQueries({ queryKey: ['sms-subjects'] });
      toast({ title: 'Subject deleted', description: 'Subject has been removed successfully.' });
    },
    onError: (e: any) => {
      toast({ title: 'Failed to delete subject', description: e?.message || 'Error', variant: 'destructive' });
    },
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
              <Button variant="outline" size="sm" onClick={() => setLocation('/campus/promotions')}>
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
            {user?.role === 'admin' && <TabsTrigger value="subjects">Subjects</TabsTrigger>}
            {user?.role === 'admin' && <TabsTrigger value="promotions">Promotions</TabsTrigger>}
          </TabsList>

          <TabsContent value="grades" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Grades Overview</CardTitle>
                <CardDescription>{Array.isArray(grades) && grades.length > 0 ? 'Your latest performance trend' : 'No grades available yet'}</CardDescription>
              </CardHeader>
              <CardContent>
                {Array.isArray(grades) && grades.length > 0 ? <GradesChart data={grades as { subject: string; score: number; maxScore: number }[]} /> : <div className="text-sm text-muted-foreground">No data</div>}
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role === 'admin' && (
            <TabsContent value="subjects" className="space-y-6 mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Book className="h-5 w-5" />
                      Create Subject
                    </CardTitle>
                    <CardDescription>Add new subjects to the curriculum</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={(e) => { e.preventDefault(); createSubject.mutate(); }} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Subject Name</Label>
                        <Input
                          id="name"
                          value={subjectForm.name}
                          onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                          placeholder="e.g., Mathematics"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="code">Subject Code (optional)</Label>
                        <Input
                          id="code"
                          value={subjectForm.code}
                          onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                          placeholder="e.g., MATH"
                        />
                      </div>

                      <Button type="submit" disabled={createSubject.isPending} className="w-full">
                        {createSubject.isPending ? 'Creating...' : 'Create Subject'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Existing Subjects</CardTitle>
                    <CardDescription>Manage curriculum subjects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-3"
                      onClick={() => seedSampleSubjects.mutate()}
                      disabled={seedSampleSubjects.isPending}
                    >
                      {seedSampleSubjects.isPending ? 'Creating...' : 'Create Sample Subjects'}
                    </Button>
                    {subjectsLoading ? (
                      <div className="text-center py-8">Loading subjects...</div>
                    ) : subjects?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No subjects found. Create your first subject.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {(subjects ?? []).map((subject: any) => (
                          <div key={subject.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <h4 className="font-medium">{subject.name}</h4>
                              {subject.code && (
                                <p className="text-sm text-muted-foreground">Code: {subject.code}</p>
                              )}
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteSubject.mutate(subject.id)}
                              disabled={deleteSubject.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="exams" className="space-y-6 mt-6">
            <div className="mb-4">
              <Input placeholder="Search exams..." className="max-w-md" />
            </div>
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
                  <Button className="mt-4" variant="outline" onClick={() => setLocation('/campus/promotions')}>Open Promotions</Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
