import { useMutation, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, ListChecks } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

export default function CampusExamsPage() {
  const { user } = useRequireAuth();
  const { toast } = useToast();
  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const { data: exams, isLoading: isLoadingExams } = useQuery({ 
    queryKey: ['sms-exams'], 
    queryFn: api.sms.exams.list 
  });
  
  const { data: years } = useQuery({ queryKey: ['sms-academic-years'], queryFn: api.sms.academicYears.list });
  const activeYear = useMemo(() => (years || []).find((y: any) => y.isActive) ?? null, [years]);
  
  const { data: terms } = useQuery({
    queryKey: ['sms-terms', activeYear?.id],
    queryFn: () => api.sms.terms.list(activeYear?.id),
    enabled: !!activeYear?.id,
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newExam, setNewExam] = useState({
    name: '',
    type: 'exam',
    termId: '',
    startDate: '',
    endDate: ''
  });

  const createExam = useMutation({
    mutationFn: () => api.sms.exams.create({
      ...newExam,
      academicYearId: activeYear!.id,
      startDate: newExam.startDate ? new Date(newExam.startDate).toISOString() : undefined,
      endDate: newExam.endDate ? new Date(newExam.endDate).toISOString() : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-exams'] });
      setIsCreateDialogOpen(false);
      setNewExam({ name: '', type: 'exam', termId: '', startDate: '', endDate: '' });
      toast({ title: 'Exam created successfully' });
    },
    onError: (e: any) => toast({ title: 'Failed to create exam', description: e.message, variant: 'destructive' })
  });

  const [selectedExamForMarks, setSelectedExamForMarks] = useState<any | null>(null);
  const { data: marks, isLoading: isLoadingMarks } = useQuery({
    queryKey: ['sms-exam-marks', selectedExamForMarks?.id],
    queryFn: () => api.sms.exams.getMarks(selectedExamForMarks!.id),
    enabled: !!selectedExamForMarks?.id
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Exams</h1>
            <p className="text-muted-foreground">Manage school examinations and marks</p>
          </div>
          {isStaff && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Exam
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Exam</DialogTitle>
                  <DialogDescription>Define a new examination period</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Exam Name</Label>
                    <Input 
                      placeholder="e.g. First Term Finals" 
                      value={newExam.name} 
                      onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newExam.type}
                        onChange={(e) => setNewExam({ ...newExam, type: e.target.value })}
                      >
                        <option value="exam">Exam</option>
                        <option value="quiz">Quiz</option>
                        <option value="test">Test</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Term</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newExam.termId}
                        onChange={(e) => setNewExam({ ...newExam, termId: e.target.value })}
                      >
                        <option value="">Select term</option>
                        {(terms || []).map((t: any) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input 
                        type="date" 
                        value={newExam.startDate} 
                        onChange={(e) => setNewExam({ ...newExam, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input 
                        type="date" 
                        value={newExam.endDate} 
                        onChange={(e) => setNewExam({ ...newExam, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => createExam.mutate()} 
                    disabled={!newExam.name || !newExam.termId || createExam.isPending}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Examination List</CardTitle>
              <CardDescription>All scheduled and completed exams</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingExams ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Loading exams...</TableCell>
                    </TableRow>
                  ) : (exams || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No exams found</TableCell>
                    </TableRow>
                  ) : (exams || []).map((exam: any) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.name}</TableCell>
                      <TableCell className="capitalize">{exam.type}</TableCell>
                      <TableCell className="text-xs">
                        {exam.startDate ? new Date(exam.startDate).toLocaleDateString() : '—'} 
                        {' to '} 
                        {exam.endDate ? new Date(exam.endDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                          exam.status === 'published' ? 'bg-green-100 text-green-700' : 
                          exam.status === 'ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {exam.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => setSelectedExamForMarks(exam)}
                        >
                          <ListChecks className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Academic settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start gap-2" disabled>
                <Edit className="w-4 h-4" />
                Grade Scales
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" disabled>
                <ListChecks className="w-4 h-4" />
                Mark Sheet Templates
              </Button>
            </CardContent>
          </Card>
        </div>

        {selectedExamForMarks && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Marks: {selectedExamForMarks.name}</CardTitle>
                <CardDescription>View and manage marks for this exam</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedExamForMarks(null)}>Close</Button>
            </CardHeader>
            <CardContent>
              {isLoadingMarks ? (
                <div className="text-center py-8 text-muted-foreground">Loading marks...</div>
              ) : (marks || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No marks recorded yet. Staff can enter marks via the teacher dashboard.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(marks || []).map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.student?.name || m.studentId}</TableCell>
                        <TableCell>{m.subject?.name || m.subjectId}</TableCell>
                        <TableCell>{m.marksObtained}</TableCell>
                        <TableCell>{m.totalMarks}</TableCell>
                        <TableCell>
                          {m.marksObtained !== null ? (
                            <span className="font-bold">
                              {Math.round((m.marksObtained / m.totalMarks) * 100)}%
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.remarks || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
