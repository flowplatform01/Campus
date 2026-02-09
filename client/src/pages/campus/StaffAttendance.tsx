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
import { Badge } from '@/components/ui/badge';
import { queryClient } from '@/lib/queryClient';
import { UserCheck, Calendar } from 'lucide-react';

export default function CampusStaffAttendancePage() {
  const { user } = useRequireAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin' || (user as any)?.subRole === 'principal' || (user as any)?.subRole === 'secretary';

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: api.users.list });
  const staff = useMemo(() => (users || []).filter((u: any) => u.role === 'employee' || u.role === 'admin'), [users]);

  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const { data: sessions, isLoading: isLoadingSessions } = useQuery({ 
    queryKey: ['sms-staff-attendance-sessions'], 
    queryFn: api.sms.staffAttendance.listSessions 
  });

  const currentSession = useMemo(() => {
    const dStr = new Date(`${date}T00:00:00`).toISOString().split('T')[0];
    return (sessions || []).find((s: any) => new Date(s.date).toISOString().split('T')[0] === dStr);
  }, [sessions, date]);

  const { data: entries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ['sms-staff-attendance-entries', currentSession?.id],
    queryFn: () => api.sms.staffAttendance.listEntries(currentSession!.id),
    enabled: !!currentSession?.id
  });

  const [marks, setMarks] = useState<Record<string, { status: string; note?: string }>>({});

  const createSession = useMutation({
    mutationFn: () => api.sms.staffAttendance.createSession(new Date(`${date}T00:00:00`).toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-staff-attendance-sessions'] });
      toast({ title: 'Staff attendance session created' });
    },
    onError: (e: any) => toast({ title: 'Failed to create session', description: e.message, variant: 'destructive' })
  });

  const saveEntries = useMutation({
    mutationFn: () => {
      const entryList = Object.entries(marks).map(([staffId, v]) => ({
        staffId,
        status: v.status,
        note: v.note
      }));
      return api.sms.staffAttendance.saveEntries(currentSession.id, entryList);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-staff-attendance-entries', currentSession?.id] });
      toast({ title: 'Staff attendance saved' });
    },
    onError: (e: any) => toast({ title: 'Failed to save', description: e.message, variant: 'destructive' })
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Staff Attendance</h1>
            <p className="text-muted-foreground">Monitor and record staff daily attendance</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>Pick a day to mark attendance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <Button 
                className="w-full gap-2" 
                onClick={() => createSession.mutate()}
                disabled={!!currentSession || createSession.isPending || !isAdmin}
              >
                <Calendar className="w-4 h-4" />
                {currentSession ? 'Session Active' : 'Start Session'}
              </Button>
              {currentSession && (
                <div className="pt-2">
                  <Badge variant="outline" className="w-full justify-center py-1">
                    Status: {currentSession.status}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Staff List</CardTitle>
              <CardDescription>Attendance entries for {new Date(date).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              {!currentSession ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No attendance session started for this date.</p>
                  {isAdmin && <p className="text-xs">Click "Start Session" to begin marking attendance.</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((s: any) => {
                        const existingEntry = (entries || []).find((e: any) => e.staffId === s.id);
                        const currentMark = marks[s.id] || { status: existingEntry?.status || 'present', note: existingEntry?.note || '' };
                        
                        return (
                          <TableRow key={s.id}>
                            <TableCell>
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-muted-foreground capitalize">{s.subRole || s.role}</div>
                            </TableCell>
                            <TableCell>
                              <select
                                className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm"
                                value={currentMark.status}
                                onChange={(e) => setMarks({ ...marks, [s.id]: { ...currentMark, status: e.target.value } })}
                                disabled={!isAdmin}
                              >
                                <option value="present">Present</option>
                                <option value="late">Late</option>
                                <option value="absent">Absent</option>
                                <option value="excused">Excused</option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <Input
                                size={1}
                                className="h-9"
                                placeholder="Add note..."
                                value={currentMark.note}
                                onChange={(e) => setMarks({ ...marks, [s.id]: { ...currentMark, note: e.target.value } })}
                                disabled={!isAdmin}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {isAdmin && (
                    <div className="flex justify-end">
                      <Button onClick={() => saveEntries.mutate()} disabled={saveEntries.isPending}>
                        Save Attendance
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
