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
import { Plus, Edit, ListChecks, Database, Users } from 'lucide-react';
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

  const { data: classes } = useQuery({ queryKey: ['sms-classes'], queryFn: api.sms.classes.list });
  const { data: subjects } = useQuery({ queryKey: ['sms-subjects'], queryFn: api.sms.subjects.list, enabled: isStaff });

  const [marksEntry, setMarksEntry] = useState({ classId: '', sectionId: '', subjectId: '', totalMarks: '100' });

  const { data: rosterRows, isLoading: isLoadingRoster } = useQuery({
    queryKey: ['sms-attendance-roster', activeYear?.id, marksEntry.classId, marksEntry.sectionId],
    queryFn: () =>
      api.sms.attendance.roster({
        academicYearId: activeYear!.id,
        classId: marksEntry.classId,
        sectionId: marksEntry.sectionId || undefined,
      }),
    enabled: !!activeYear?.id && !!marksEntry.classId && isStaff,
  });

  const rosterStudents = useMemo(() => {
    return (rosterRows || [])
      .map((r: any) => r?.student)
      .filter((s: any) => !!s?.id);
  }, [rosterRows]);

  const existingMarksMap = useMemo(() => {
    const out = new Map<string, any>();
    const subjectId = marksEntry.subjectId;
    if (!subjectId) return out;
    for (const m of marks || []) {
      if (!m?.studentId) continue;
      if (String(m.subjectId) !== String(subjectId)) continue;
      out.set(String(m.studentId), m);
    }
    return out;
  }, [marks, marksEntry.subjectId]);

  const [draftMarks, setDraftMarks] = useState<Record<string, { marksObtained: string; remarks: string }>>({});

  const saveMarks = useMutation({
    mutationFn: async () => {
      if (!selectedExamForMarks?.id) throw new Error('Select an exam');
      if (!marksEntry.classId) throw new Error('Select a class');
      if (!marksEntry.subjectId) throw new Error('Select a subject');
      const totalMarks = Number(marksEntry.totalMarks);
      if (!Number.isFinite(totalMarks) || totalMarks <= 0) throw new Error('Total marks must be a positive number');

      const payload = rosterStudents.map((s: any) => {
        const d = draftMarks[String(s.id)];
        const existing = existingMarksMap.get(String(s.id));
        const raw = d?.marksObtained ?? (existing?.marksObtained ?? '');
        const parsed = raw === '' || raw === null || raw === undefined ? undefined : Number(raw);
        return {
          studentId: String(s.id),
          subjectId: String(marksEntry.subjectId),
          marksObtained: parsed,
          totalMarks,
          remarks: (d?.remarks ?? existing?.remarks ?? '') || undefined,
        };
      });

      return api.sms.exams.saveMarks(selectedExamForMarks.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sms-exam-marks', selectedExamForMarks?.id] });
      toast({ title: 'Marks saved' });
    },
    onError: (e: any) => toast({ title: 'Failed to save marks', description: e?.message || 'Error', variant: 'destructive' }),
  });

  // Sample data creation mutations
  const createSampleExams = useMutation({
    mutationFn: () => api.sms.exams.createSampleData(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-exams'] });
      toast({ title: 'Sample exams created', description: 'Sample exam records have been added successfully.' });
    },
    onError: (e: any) => toast({ title: 'Failed to create sample data', description: e.message, variant: 'destructive' })
  });

  const createSampleMarks = useMutation({
    mutationFn: (examId: string) => api.sms.exams.createSampleMarks(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-exam-marks', selectedExamForMarks?.id] });
      toast({ title: 'Sample marks created', description: 'Sample marks have been added to this exam.' });
    },
    onError: (e: any) => toast({ title: 'Failed to create sample marks', description: e.message, variant: 'destructive' })
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
              <div className="mb-4">
                <Input placeholder="Search exams..." className="max-w-md" />
              </div>
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
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>System management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2" 
                onClick={() => createSampleExams.mutate()}
                disabled={createSampleExams.isPending}
              >
                <Database className="w-4 h-4" />
                {createSampleExams.isPending ? 'Creating...' : 'Create Sample Exams'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2" 
                onClick={() => selectedExamForMarks && createSampleMarks.mutate(selectedExamForMarks.id)}
                disabled={!selectedExamForMarks || createSampleMarks.isPending}
              >
                <Users className="w-4 h-4" />
                {createSampleMarks.isPending ? 'Creating...' : 'Add Sample Marks'}
              </Button>
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
              {isStaff && (
                <div className="space-y-4 mb-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="grid gap-2">
                      <Label>Class</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={marksEntry.classId}
                        onChange={(e) => {
                          setDraftMarks({});
                          setMarksEntry({ ...marksEntry, classId: e.target.value, sectionId: '' });
                        }}
                      >
                        <option value="">Select class</option>
                        {(classes || []).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Subject</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={marksEntry.subjectId}
                        onChange={(e) => {
                          setDraftMarks({});
                          setMarksEntry({ ...marksEntry, subjectId: e.target.value });
                        }}
                        disabled={!marksEntry.classId}
                      >
                        <option value="">Select subject</option>
                        {(subjects || []).map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Total</Label>
                      <Input
                        value={marksEntry.totalMarks}
                        onChange={(e) => setMarksEntry({ ...marksEntry, totalMarks: e.target.value })}
                        placeholder="100"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>&nbsp;</Label>
                      <Button
                        onClick={() => saveMarks.mutate()}
                        disabled={saveMarks.isPending || !marksEntry.classId || !marksEntry.subjectId || rosterStudents.length === 0}
                      >
                        {saveMarks.isPending ? 'Saving...' : 'Save Marks'}
                      </Button>
                    </div>
                  </div>

                  {!marksEntry.classId ? (
                    <div className="text-sm text-muted-foreground">Select a class to load students.</div>
                  ) : !marksEntry.subjectId ? (
                    <div className="text-sm text-muted-foreground">Select a subject to start entering marks.</div>
                  ) : isLoadingRoster ? (
                    <div className="text-sm text-muted-foreground">Loading class roster...</div>
                  ) : rosterStudents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No active students found for the selected class.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="w-32">Marks</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rosterStudents.map((s: any) => {
                          const id = String(s.id);
                          const existing = existingMarksMap.get(id);
                          const d = draftMarks[id];
                          const value = d?.marksObtained ?? (existing?.marksObtained ?? '');
                          const remarks = d?.remarks ?? (existing?.remarks ?? '');
                          return (
                            <TableRow key={id}>
                              <TableCell className="font-medium">{s.name} {s.studentId ? `(${s.studentId})` : ''}</TableCell>
                              <TableCell>
                                <Input
                                  value={String(value ?? '')}
                                  onChange={(e) =>
                                    setDraftMarks((prev) => ({
                                      ...prev,
                                      [id]: { marksObtained: e.target.value, remarks: prev[id]?.remarks ?? String(remarks ?? '') },
                                    }))
                                  }
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={String(remarks ?? '')}
                                  onChange={(e) =>
                                    setDraftMarks((prev) => ({
                                      ...prev,
                                      [id]: { marksObtained: prev[id]?.marksObtained ?? String(value ?? ''), remarks: e.target.value },
                                    }))
                                  }
                                  placeholder="Optional"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

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
