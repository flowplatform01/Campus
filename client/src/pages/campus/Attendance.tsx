import { useMutation, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CampusAttendancePage() {
  const { user } = useRequireAuth();
  const { toast } = useToast();

  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const { data: years } = useQuery({ queryKey: ['sms-academic-years'], queryFn: () => api.sms.academicYears.list() });
  const activeYear = useMemo(() => (years || []).find((y: any) => y.isActive) ?? null, [years]);
  const { data: terms } = useQuery({
    queryKey: ['sms-terms', activeYear?.id ?? null],
    queryFn: () => api.sms.terms.list(activeYear?.id),
    enabled: !!activeYear?.id,
  });
  const { data: classes } = useQuery({ queryKey: ['sms-classes'], queryFn: () => api.sms.classes.list() });
  const { data: sections } = useQuery({ queryKey: ['sms-sections'], queryFn: () => api.sms.sections.list() });
  const { data: subjects } = useQuery({ queryKey: ['sms-subjects'], queryFn: () => api.sms.subjects.list() });

  const subjectNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of subjects || []) m[s.id] = s.name;
    return m;
  }, [subjects]);

  const [scope, setScope] = useState({ termId: '', classId: '', sectionId: '', subjectId: '' });
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [session, setSession] = useState<any | null>(null);
  const [marks, setMarks] = useState<Record<string, { status: string; note?: string }>>({});

  const { data: roster, isLoading: isLoadingRoster } = useQuery({
    queryKey: ['sms-attendance-roster', activeYear?.id ?? null, scope.classId || null, scope.sectionId || null],
    queryFn: () => api.sms.attendance.roster({ academicYearId: activeYear!.id, classId: scope.classId, sectionId: scope.sectionId || undefined }),
    enabled: isStaff && !!activeYear?.id && !!scope.classId,
  });

  const createSession = useMutation({
    mutationFn: () =>
      api.sms.attendance.createSession({
        academicYearId: activeYear!.id,
        termId: scope.termId,
        classId: scope.classId,
        sectionId: scope.sectionId || undefined,
        subjectId: scope.subjectId || undefined,
        date: new Date(`${date}T00:00:00`).toISOString(),
      }),
    onSuccess: (row: any) => {
      setSession(row);
      toast({ title: 'Attendance session ready' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const saveEntries = useMutation({
    mutationFn: () => {
      const entries = Object.entries(marks).map(([studentId, v]) => ({ studentId, status: v.status, note: v.note }));
      return api.sms.attendance.saveEntries(session.id, entries);
    },
    onSuccess: async () => {
      toast({ title: 'Saved' });
    },
    onError: (e: any) => toast({ title: 'Failed to save', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const submitSession = useMutation({
    mutationFn: () => api.sms.attendance.submitSession(session.id),
    onSuccess: (row: any) => {
      setSession(row);
      toast({ title: 'Submitted' });
    },
    onError: (e: any) => toast({ title: 'Failed to submit', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const lockSession = useMutation({
    mutationFn: () => api.sms.attendance.lockSession(session.id),
    onSuccess: (row: any) => {
      setSession(row);
      toast({ title: 'Locked' });
    },
    onError: (e: any) => toast({ title: 'Failed to lock', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const { data: my } = useQuery({
    queryKey: ['sms-attendance-my', user?.role],
    queryFn: api.sms.attendance.my,
    enabled: !isStaff,
  });

  const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: () => api.users.listStaff(), enabled: user?.role === 'admin' });
  const [staffMarks, setStaffMarks] = useState<Record<string, string>>({});

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <img src="/brand-icon.svg" alt="Campus" className="h-10 w-10" />
          <div>
            <h1 className="text-3xl font-bold">Attendance</h1>
            <p className="text-muted-foreground">Manage and view attendance records</p>
          </div>
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Student Attendance</TabsTrigger>
            {user?.role === 'admin' && <TabsTrigger value="staff">Staff Attendance</TabsTrigger>}
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{isStaff ? 'Mark Attendance' : 'My Attendance'}</CardTitle>
                <CardDescription>{isStaff ? 'Create a session, mark, submit, and lock' : 'Locked attendance entries'}</CardDescription>
              </CardHeader>
              <CardContent>
                {isStaff ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Term</Label>
                        <select
                          value={scope.termId}
                          onChange={(e) => setScope({ ...scope, termId: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select term</option>
                          {(terms || []).map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Date</Label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Class</Label>
                        <select
                          value={scope.classId}
                          onChange={(e) => {
                            setScope({ ...scope, classId: e.target.value, sectionId: '' });
                            setMarks({});
                            setSession(null);
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select class</option>
                          {(classes || []).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Section (optional)</Label>
                        <select
                          value={scope.sectionId}
                          onChange={(e) => {
                            setScope({ ...scope, sectionId: e.target.value });
                            setMarks({});
                            setSession(null);
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">All / None</option>
                          {(sections || []).filter((s: any) => !scope.classId || s.classId === scope.classId).map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label>Subject (optional)</Label>
                        <select
                          value={scope.subjectId}
                          onChange={(e) => {
                            setScope({ ...scope, subjectId: e.target.value });
                            setSession(null);
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">(none)</option>
                          {(subjects || []).map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => createSession.mutate()}
                        disabled={!activeYear?.id || !scope.termId || !scope.classId || createSession.isPending}
                      >
                        Create / Load Session
                      </Button>
                      {session && (
                        <Badge variant={session.status === 'draft' ? 'outline' : session.status === 'submitted' ? 'secondary' : 'default'}>
                          {session.status}
                        </Badge>
                      )}
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(roster || []).map((r: any) => {
                          const s = r.student;
                          const v = marks[s.id]?.status || 'present';
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell>
                                <select
                                  value={v}
                                  onChange={(e) => setMarks({ ...marks, [s.id]: { status: e.target.value } })}
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                  disabled={!session || session.status !== 'draft'}
                                >
                                  <option value="present">present</option>
                                  <option value="late">late</option>
                                  <option value="absent">absent</option>
                                  <option value="excused">excused</option>
                                </select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={marks[s.id]?.note || ''}
                                  onChange={(e) => setMarks({ ...marks, [s.id]: { ...marks[s.id], status: v, note: e.target.value } })}
                                  placeholder="Add note..."
                                  disabled={!session || session.status !== 'draft'}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {(roster || []).length === 0 && !isLoadingRoster && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">No enrolled students</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => saveEntries.mutate()}
                        disabled={!session || session.status !== 'draft' || saveEntries.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => submitSession.mutate()}
                        disabled={!session || session.status !== 'draft' || submitSession.isPending}
                      >
                        Submit
                      </Button>
                      {user?.role === 'admin' && (
                        <Button
                          variant="secondary"
                          onClick={() => lockSession.mutate()}
                          disabled={!session || session.status !== 'submitted' || lockSession.isPending}
                        >
                          Lock
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {((my?.entries || []) as any[]).map((row: any) => (
                        <TableRow key={row.entry.id}>
                          <TableCell>{new Date(row.session.date).toLocaleDateString()}</TableCell>
                          <TableCell>{row.session.subjectId ? subjectNameById[row.session.subjectId] || row.session.subjectId : '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.entry.status === 'present'
                                  ? 'default'
                                  : row.entry.status === 'late'
                                  ? 'secondary'
                                  : row.entry.status === 'excused'
                                  ? 'outline'
                                  : 'destructive'
                              }
                            >
                              {row.entry.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.entry.note || '—'}</TableCell>
                        </TableRow>
                      ))}
                      {(my?.entries || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No attendance records yet</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role === 'admin' && (
            <TabsContent value="staff" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Staff Attendance</CardTitle>
                  <CardDescription>Mark attendance for all employees</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="grid gap-2">
                      <Label>Attendance Date</Label>
                      <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <Button variant="outline">Initialize Session</Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(staff || []).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="capitalize">{s.subRole}</TableCell>
                          <TableCell>
                            <select
                              value={staffMarks[s.id] || 'present'}
                              onChange={e => setStaffMarks({...staffMarks, [s.id]: e.target.value})}
                              className="flex h-9 w-32 rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                            </select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button disabled={!staff?.length}>Save Staff Attendance</Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
