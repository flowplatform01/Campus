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
import { Plus, Edit, ListChecks, Database, Users, Download, Printer } from 'lucide-react';
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

  const [selectedExamId, setSelectedExamId] = useState('');

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

  const selectedExamForMarks = useMemo(() => {
    const id = String(selectedExamId || '');
    if (!id) return null;
    return (exams || []).find((e: any) => String(e?.id) === id) ?? null;
  }, [exams, selectedExamId]);

  const { data: marks, isLoading: isLoadingMarks } = useQuery({
    queryKey: ['sms-exam-marks', selectedExamId || null],
    queryFn: () => api.sms.exams.getMarks(selectedExamId),
    enabled: !!selectedExamId
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

  const examSummary = useMemo(() => {
    const list = (marks || []) as any[];
    const scored = list.filter((m) => typeof m?.marksObtained === 'number' && typeof m?.totalMarks === 'number' && m.totalMarks > 0);
    const overall = {
      count: scored.length,
      averagePct: 0,
      minPct: 0,
      maxPct: 0,
    };
    if (scored.length > 0) {
      const pcts = scored
        .map((m) => (Number(m.marksObtained) / Number(m.totalMarks)) * 100)
        .filter((v) => Number.isFinite(v));
      const sum = pcts.reduce((a, b) => a + b, 0);
      overall.averagePct = sum / Math.max(pcts.length, 1);
      overall.minPct = Math.min(...pcts);
      overall.maxPct = Math.max(...pcts);
    }

    const bySubject = new Map<string, { subjectId: string; subjectName: string; count: number; averagePct: number }>();
    for (const m of scored) {
      const subjectId = String(m.subjectId || '');
      if (!subjectId) continue;
      const subjectName = String(m?.subject?.name || m.subjectId);
      const pct = (Number(m.marksObtained) / Number(m.totalMarks)) * 100;
      const existing = bySubject.get(subjectId) || { subjectId, subjectName, count: 0, averagePct: 0 };
      const nextCount = existing.count + 1;
      const nextAvg = (existing.averagePct * existing.count + pct) / nextCount;
      bySubject.set(subjectId, { ...existing, count: nextCount, averagePct: nextAvg });
    }

    return {
      overall,
      subjects: Array.from(bySubject.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
    };
  }, [marks]);

  const exportMarksCsv = () => {
    if (!selectedExamId) return;
    const list = (marks || []) as any[];
    const rows = list.map((m) => {
      const studentName = String(m?.student?.name || '');
      const studentRef = String(m?.student?.studentId || m?.studentId || '');
      const subjectName = String(m?.subject?.name || m?.subjectId || '');
      const obtained = m?.marksObtained ?? '';
      const total = m?.totalMarks ?? '';
      const pct = typeof m?.marksObtained === 'number' && typeof m?.totalMarks === 'number' && m.totalMarks > 0
        ? ((m.marksObtained / m.totalMarks) * 100).toFixed(2)
        : '';
      const remarks = String(m?.remarks || '');
      return [studentName, studentRef, subjectName, String(obtained), String(total), String(pct), remarks];
    });

    const header = ['Student Name', 'Student ID', 'Subject', 'Marks Obtained', 'Total Marks', 'Percent', 'Remarks'];
    const escapeCell = (v: string) => {
      const s = String(v ?? '');
      if (/[\n\r",]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const csv = [header, ...rows].map((r) => r.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-marks-${selectedExamId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const saveMarks = useMutation({
    mutationFn: async () => {
      if (!selectedExamId) throw new Error('Select an exam');
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

      return api.sms.exams.saveMarks(selectedExamId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sms-exam-marks', selectedExamId || null] });
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
      queryClient.invalidateQueries({ queryKey: ['sms-exam-marks', selectedExamId || null] });
      toast({ title: 'Sample marks created', description: 'Sample marks have been added to this exam.' });
    },
    onError: (e: any) => toast({ title: 'Failed to create sample data', description: e.message, variant: 'destructive' })
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/brand-icon.svg" alt="Campus" className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Exams</h1>
              <p className="text-muted-foreground">Manage school examinations and marks</p>
            </div>
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
                          onClick={() => setSelectedExamId(String(exam.id))}
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex-1">
              <CardTitle>Marks & Analytics</CardTitle>
              <CardDescription>Choose an exam, then view and manage marks</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="grid gap-1">
                <Label className="text-xs">Exam</Label>
                <select
                  className="flex h-9 w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedExamId}
                  onChange={(e) => {
                    setDraftMarks({});
                    setMarksEntry({ classId: '', sectionId: '', subjectId: '', totalMarks: '100' });
                    setSelectedExamId(e.target.value);
                  }}
                >
                  <option value="">Select exam</option>
                  {(exams || []).map((exam: any) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!selectedExamId}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={exportMarksCsv} disabled={!selectedExamId || (marks || []).length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!selectedExamForMarks ? (
              <div className="text-sm text-muted-foreground">Select an exam to view marks, analytics, and enter grades.</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Overall Average</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {examSummary.overall.count > 0 ? `${examSummary.overall.averagePct.toFixed(1)}%` : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">{examSummary.overall.count} scored entries</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Highest / Lowest</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {examSummary.overall.count > 0
                          ? `${examSummary.overall.maxPct.toFixed(1)}% / ${examSummary.overall.minPct.toFixed(1)}%`
                          : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">Across all recorded marks</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Subjects Graded</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{examSummary.subjects.length}</div>
                      <div className="text-xs text-muted-foreground">With at least 1 score</div>
                    </CardContent>
                  </Card>
                </div>

                {examSummary.subjects.length > 0 && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Subject Analytics</CardTitle>
                      <CardDescription>Average percentage per subject</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-right">Entries</TableHead>
                            <TableHead className="text-right">Average</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {examSummary.subjects.map((s) => (
                            <TableRow key={s.subjectId}>
                              <TableCell className="font-medium">{s.subjectName}</TableCell>
                              <TableCell className="text-right">{s.count}</TableCell>
                              <TableCell className="text-right">{s.averagePct.toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

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
                          disabled={
                            saveMarks.isPending ||
                            !marksEntry.classId ||
                            !marksEntry.subjectId ||
                            rosterStudents.length === 0 ||
                            selectedExamForMarks?.status === 'published'
                          }
                        >
                          {selectedExamForMarks?.status === 'published'
                            ? 'Grades locked (published)'
                            : saveMarks.isPending
                              ? 'Saving...'
                              : 'Save Marks'}
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
