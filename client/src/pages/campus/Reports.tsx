import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function CampusReportsPage() {
  useRequireAuth();

  const [scope, setScope] = useState({ academicYearId: '', termId: '', classId: '', studentId: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['sms-reports-summary'],
    queryFn: api.sms.reports.summary,
  });

  const { data: years } = useQuery({ queryKey: ['sms-academic-years'], queryFn: api.sms.academicYears.list });
  const activeYear = useMemo(() => (years || []).find((y: any) => y.isActive) ?? null, [years]);
  const effectiveYearId = scope.academicYearId || activeYear?.id || '';

  const { data: terms } = useQuery({
    queryKey: ['sms-terms', effectiveYearId || null],
    queryFn: () => api.sms.terms.list(effectiveYearId),
    enabled: !!effectiveYearId,
  });

  const { data: classes } = useQuery({ queryKey: ['sms-classes'], queryFn: api.sms.classes.list });

  const { data: roster } = useQuery({
    queryKey: ['sms-attendance-roster', effectiveYearId || null, scope.classId || null],
    queryFn: () =>
      api.sms.attendance.roster({
        academicYearId: effectiveYearId,
        classId: scope.classId,
      }),
    enabled: !!effectiveYearId && !!scope.classId,
  });

  const rosterStudents = useMemo(() => {
    return (roster || []).map((r: any) => r?.student).filter((s: any) => !!s?.id);
  }, [roster]);

  const openExport = (path: string) => {
    const token = localStorage.getItem('campus_access_token');
    const url = `${API_BASE}${path}`;
    // Use fetch to include Authorization then open blob
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || 'Export failed');
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');
      })
      .catch(() => {
        // no toast here to avoid extra deps in this file
        alert('Failed to export report');
      });
  };

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

        <Card>
          <CardHeader>
            <CardTitle>Report Cards & Exports</CardTitle>
            <CardDescription>Generate student/class PDFs and spreadsheets</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label>Academic Year</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={scope.academicYearId}
                  onChange={(e) => setScope({ ...scope, academicYearId: e.target.value, termId: '' })}
                >
                  <option value="">Active year</option>
                  {(years || []).map((y: any) => (
                    <option key={y.id} value={y.id}>{y.name}{y.isActive ? ' (active)' : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Term</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={scope.termId}
                  onChange={(e) => setScope({ ...scope, termId: e.target.value })}
                  disabled={!effectiveYearId}
                >
                  <option value="">Select term</option>
                  {(terms || []).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Class</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={scope.classId}
                  onChange={(e) => setScope({ ...scope, classId: e.target.value, studentId: '' })}
                >
                  <option value="">Select class</option>
                  {(classes || []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Student (optional)</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={scope.studentId}
                  onChange={(e) => setScope({ ...scope, studentId: e.target.value })}
                  disabled={!scope.classId}
                >
                  <option value="">All / none</option>
                  {rosterStudents.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}{s.studentId ? ` (${s.studentId})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Button
                variant="outline"
                disabled={!scope.classId || !effectiveYearId || !scope.termId}
                onClick={() => openExport(`/api/export/class/${encodeURIComponent(scope.classId)}/pdf?academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}`)}
              >
                Download Class PDF
              </Button>
              <Button
                variant="outline"
                disabled={!scope.classId || !effectiveYearId || !scope.termId}
                onClick={() => openExport(`/api/export/class/${encodeURIComponent(scope.classId)}/excel?academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}`)}
              >
                Download Class Excel
              </Button>
              <Button
                disabled={!scope.studentId || !effectiveYearId || !scope.termId}
                onClick={() => openExport(`/api/export/student/${encodeURIComponent(scope.studentId)}/pdf?academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}`)}
              >
                Download Student PDF (Report Card)
              </Button>
              <Button
                disabled={!scope.studentId || !effectiveYearId || !scope.termId}
                onClick={() => openExport(`/api/export/student/${encodeURIComponent(scope.studentId)}/excel?academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}`)}
              >
                Download Student Excel
              </Button>
            </div>

            <div className="grid gap-2">
              <Label>Attendance export (optional)</Label>
              <div className="grid gap-2 md:grid-cols-2">
                <Button
                  variant="outline"
                  disabled={!scope.classId || !effectiveYearId || !scope.termId}
                  onClick={() => openExport(`/api/export/attendance/pdf?classId=${encodeURIComponent(scope.classId)}&academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}`)}
                >
                  Download Attendance PDF
                </Button>
                <Button
                  variant="outline"
                  disabled={!scope.classId || !effectiveYearId || !scope.termId}
                  onClick={() => openExport(`/api/export/attendance/excel?classId=${encodeURIComponent(scope.classId)}&academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}`)}
                >
                  Download Attendance Excel
                </Button>
              </div>
            </div>

            <div className="hidden">
              <Input />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
