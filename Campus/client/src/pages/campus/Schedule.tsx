import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function CampusSchedulePage() {
  const { user } = useRequireAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: years } = useQuery({ queryKey: ['sms-academic-years'], queryFn: api.sms.academicYears.list });
  const activeYear = useMemo(() => (years || []).find((y: any) => y.isActive) ?? null, [years]);

  const { data: terms } = useQuery({
    queryKey: ['sms-terms', activeYear?.id ?? null],
    queryFn: () => api.sms.terms.list(activeYear?.id),
    enabled: !!activeYear?.id,
  });
  const { data: classes } = useQuery({ queryKey: ['sms-classes'], queryFn: api.sms.classes.list });
  const { data: sections } = useQuery({ queryKey: ['sms-sections'], queryFn: api.sms.sections.list });
  const { data: subjects } = useQuery({ queryKey: ['sms-subjects'], queryFn: api.sms.subjects.list });
  const { data: employees } = useQuery({ queryKey: ['users'], queryFn: api.users.list });

  const [scope, setScope] = useState({ termId: '', classId: '', sectionId: '' });
  const [slotForm, setSlotForm] = useState({ weekday: 'mon', startTime: '08:00', endTime: '09:00', subjectId: '', teacherId: '', room: '' });

  const subjectNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of subjects || []) m[s.id] = s.name;
    return m;
  }, [subjects]);

  const userNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const u of employees || []) m[u.id] = u.name;
    return m;
  }, [employees]);

  const { data: week, isLoading } = useQuery({
    queryKey: ['sms-timetable-week', user?.role, activeYear?.id ?? null, scope.termId || null, scope.classId || null, scope.sectionId || null],
    queryFn: () =>
      api.sms.timetable.week(
        user?.role === 'admin'
          ? {
              academicYearId: activeYear?.id,
              termId: scope.termId || undefined,
              classId: scope.classId || undefined,
              sectionId: scope.sectionId || undefined,
            }
          : undefined
      ),
    enabled: user?.role === 'admin' ? !!activeYear?.id && !!scope.termId && !!scope.classId : true,
  });

  const createSlot = useMutation({
    mutationFn: () =>
      api.sms.timetable.createSlot({
        academicYearId: activeYear.id,
        termId: scope.termId,
        classId: scope.classId,
        sectionId: scope.sectionId || undefined,
        weekday: slotForm.weekday,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        subjectId: slotForm.subjectId,
        teacherId: slotForm.teacherId,
        room: slotForm.room || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-timetable-week'] });
      toast({ title: 'Slot added' });
    },
    onError: (e: any) => toast({ title: 'Failed to add slot', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const publish = useMutation({
    mutationFn: () => api.sms.timetable.publish({ academicYearId: activeYear.id, termId: scope.termId, classId: scope.classId, sectionId: scope.sectionId || undefined }),
    onSuccess: async () => {
      toast({ title: 'Timetable published (locked)' });
    },
    onError: (e: any) => toast({ title: 'Failed to publish', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const slotsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const d of days) map[d] = [];
    for (const s of week?.slots || []) {
      map[s.weekday] = map[s.weekday] || [];
      map[s.weekday].push(s);
    }
    for (const d of days) {
      map[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }
    return map;
  }, [week]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">Class timetable</p>
        </div>

        {user?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Build Timetable (Admin)</CardTitle>
              <CardDescription>Wizard-style builder is being expanded. This is the functional core: scope → add slots → publish/lock.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tt-term">Term</Label>
                <select
                  id="tt-term"
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
                <Label htmlFor="tt-class">Class</Label>
                <select
                  id="tt-class"
                  value={scope.classId}
                  onChange={(e) => setScope({ ...scope, classId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select class</option>
                  {(classes || []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tt-section">Section (optional)</Label>
                <select
                  id="tt-section"
                  value={scope.sectionId}
                  onChange={(e) => setScope({ ...scope, sectionId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All / None</option>
                  {(sections || []).filter((s: any) => !scope.classId || s.classId === scope.classId).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Day</Label>
                  <select
                    value={slotForm.weekday}
                    onChange={(e) => setSlotForm({ ...slotForm, weekday: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {days.map((d) => (<option key={d} value={d}>{d.toUpperCase()}</option>))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Room</Label>
                  <Input value={slotForm.room} onChange={(e) => setSlotForm({ ...slotForm, room: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start (HH:MM)</Label>
                  <Input value={slotForm.startTime} onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>End (HH:MM)</Label>
                  <Input value={slotForm.endTime} onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Subject</Label>
                <select
                  value={slotForm.subjectId}
                  onChange={(e) => setSlotForm({ ...slotForm, subjectId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select subject</option>
                  {(subjects || []).map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Teacher (Employee)</Label>
                <select
                  value={slotForm.teacherId}
                  onChange={(e) => setSlotForm({ ...slotForm, teacherId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select employee</option>
                  {(employees || []).filter((u: any) => u.role === 'employee').map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => createSlot.mutate()} disabled={!activeYear?.id || !scope.termId || !scope.classId || !slotForm.subjectId || !slotForm.teacherId || createSlot.isPending}>
                  Add Slot
                </Button>
                <Button variant="outline" onClick={() => publish.mutate()} disabled={!activeYear?.id || !scope.termId || !scope.classId || publish.isPending}>
                  Publish / Lock
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading...' : `${(week?.slots || []).length} slots`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {days.slice(0, 6).map((d) => (
                <Card key={d}>
                  <CardHeader>
                    <CardTitle className="text-base">{d.toUpperCase()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(slotsByDay[d] || []).map((s: any) => (
                        <div key={s.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{s.startTime} - {s.endTime}</div>
                            <div className="text-xs text-muted-foreground">{s.room || '—'}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">Subject: {subjectNameById[s.subjectId] || s.subjectId}</div>
                          <div className="text-sm text-muted-foreground">Teacher: {userNameById[s.teacherId] || s.teacherId}</div>
                        </div>
                      ))}
                      {(slotsByDay[d] || []).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No slots</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
