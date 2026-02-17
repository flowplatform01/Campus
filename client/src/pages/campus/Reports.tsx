import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Settings2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const REPORT_CONFIG_KEY = 'campus_report_config';

function getReportConfig() {
  try {
    const raw = localStorage.getItem(REPORT_CONFIG_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        autoRemarks: p.autoRemarks !== false,
        showRanking: p.showRanking !== false,
      };
    }
  } catch { /* ignore */ }
  return { autoRemarks: true, showRanking: true };
}

export default function CampusReportsPage() {
  const { user } = useRequireAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reportConfig, setReportConfig] = useState(getReportConfig);
  const [configOpen, setConfigOpen] = useState(false);
  const [scope, setScope] = useState({ academicYearId: '', termId: '', classId: '', examId: '', studentId: '' });
  const [publicationScopeType, setPublicationScopeType] = useState<'student' | 'class' | 'exam' | 'term' | 'academic_year'>('student');
  const [publicationStatus, setPublicationStatus] = useState<'draft' | 'reviewed' | 'published'>('draft');

  const isStaff = user?.role === 'admin' || user?.role === 'employee';
  const isStudentOrParent = user?.role === 'student' || user?.role === 'parent';

  const updateConfig = (key: 'autoRemarks' | 'showRanking', value: boolean) => {
    const next = { ...reportConfig, [key]: value };
    setReportConfig(next);
    localStorage.setItem(REPORT_CONFIG_KEY, JSON.stringify(next));
  };

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

  const { data: exams } = useQuery({ queryKey: ['sms-exams'], queryFn: api.sms.exams.list });

  const filteredExams = useMemo(() => {
    const yearId = effectiveYearId;
    const termId = scope.termId;
    return (exams || [])
      .filter((e: any) => (!yearId ? true : String(e.academicYearId) === String(yearId)))
      .filter((e: any) => (!termId ? true : String(e.termId) === String(termId)));
  }, [exams, effectiveYearId, scope.termId]);

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
    const sep = path.includes('?') ? '&' : '?';
    const opts = `${sep}autoRemarks=${reportConfig.autoRemarks}&showRanking=${reportConfig.showRanking}`;
    const url = `${API_BASE}${path}${opts}`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as any)?.message || 'Export failed');
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');
        toast({ title: 'Export started', description: 'Your report is downloading.' });
      })
      .catch((e) => {
        toast({ title: 'Export failed', description: e instanceof Error ? e.message : 'Unable to export', variant: 'destructive' });
      });
  };

  const { data: publications } = useQuery({
    queryKey: ['sms-report-publications'],
    queryFn: () => api.sms.reports.publications.list(),
    enabled: isStaff,
  });

  const { data: myReports } = useQuery({
    queryKey: ['sms-my-reports'],
    queryFn: () => api.sms.reports.my.list(),
    enabled: isStudentOrParent,
  });

  const createPublication = useMutation({
    mutationFn: () => {
      const academicYearId = effectiveYearId;
      const termId = scope.termId;
      return api.sms.reports.publications.create({
        scopeType: publicationScopeType,
        academicYearId,
        termId,
        examId: scope.examId || undefined,
        classId: scope.classId || undefined,
        studentId: scope.studentId || undefined,
        status: publicationStatus,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-report-publications'] });
      toast({ title: 'Publication created' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Unable to create publication', variant: 'destructive' }),
  });

  const updatePublicationStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'draft' | 'reviewed' | 'published' }) =>
      api.sms.reports.publications.update(id, { status }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-report-publications'] });
      await qc.invalidateQueries({ queryKey: ['sms-my-reports'] });
      toast({ title: 'Publication updated' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Unable to update publication', variant: 'destructive' }),
  });

  const cards = data?.cards || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <img src="/brand-icon.svg" alt="Campus" className="h-10 w-10" />
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground">Analytics and summaries</p>
          </div>
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
            <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Report Configuration
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="rounded-lg border p-4 mt-2 space-y-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-generated remarks</Label>
                      <p className="text-xs text-muted-foreground">Add rule-based remarks to report cards based on performance and attendance</p>
                    </div>
                    <Switch checked={reportConfig.autoRemarks} onCheckedChange={(v) => updateConfig('autoRemarks', v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Show ranking</Label>
                      <p className="text-xs text-muted-foreground">Include class rank in reports (when applicable)</p>
                    </div>
                    <Switch checked={reportConfig.showRanking} onCheckedChange={(v) => updateConfig('showRanking', v)} />
                  </div>
                  <p className="text-xs text-muted-foreground">Default grading: A (90-100), B (80-89), C (70-79), D (60-69), F (&lt;60)</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="grid gap-2">
                <Label>Academic Year</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={scope.academicYearId}
                  onChange={(e) => setScope({ ...scope, academicYearId: e.target.value, termId: '', examId: '', studentId: '' })}
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
                  onChange={(e) => setScope({ ...scope, termId: e.target.value, examId: '', studentId: '' })}
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
                <Label>Exam</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={scope.examId}
                  onChange={(e) => setScope({ ...scope, examId: e.target.value })}
                  disabled={!effectiveYearId || !scope.termId}
                >
                  <option value="">All / none</option>
                  {filteredExams.map((ex: any) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
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
                onClick={() => {
                  const examPart = scope.examId ? `&examId=${encodeURIComponent(scope.examId)}` : '';
                  openExport(`/api/export/class/${encodeURIComponent(scope.classId)}/pdf?academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}${examPart}`);
                }}
              >
                Download Class PDF
              </Button>
              <Button
                variant="outline"
                disabled={!scope.classId || !effectiveYearId || !scope.termId}
                onClick={() => {
                  const examPart = scope.examId ? `&examId=${encodeURIComponent(scope.examId)}` : '';
                  openExport(`/api/export/class/${encodeURIComponent(scope.classId)}/excel?academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}${examPart}`);
                }}
              >
                Download Class CSV
              </Button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Button
                disabled={!scope.classId || !scope.studentId || !effectiveYearId || !scope.termId}
                onClick={() => {
                  const examPart = scope.examId ? `&examId=${encodeURIComponent(scope.examId)}` : '';
                  openExport(`/api/export/student/${encodeURIComponent(scope.studentId)}/pdf?academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}${examPart}`);
                }}
              >
                Download Student PDF (Report Card)
              </Button>
              <Button
                disabled={!scope.classId || !scope.studentId || !effectiveYearId || !scope.termId}
                onClick={() => {
                  const examPart = scope.examId ? `&examId=${encodeURIComponent(scope.examId)}` : '';
                  openExport(`/api/export/student/${encodeURIComponent(scope.studentId)}/excel?academicYearId=${encodeURIComponent(effectiveYearId)}&termId=${encodeURIComponent(scope.termId)}${examPart}`);
                }}
              >
                Download Student CSV
              </Button>
            </div>

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
                Download Attendance CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {isStaff && (
          <Card>
            <CardHeader>
              <CardTitle>Report Publishing</CardTitle>
              <CardDescription>Create, review, publish and distribute report cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="grid gap-2">
                  <Label>Scope</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={publicationScopeType}
                    onChange={(e) => setPublicationScopeType(e.target.value as any)}
                  >
                    <option value="student">Student</option>
                    <option value="class">Class</option>
                    <option value="exam">Exam</option>
                    <option value="term">Term</option>
                    <option value="academic_year">Academic Year</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={publicationStatus}
                    onChange={(e) => setPublicationStatus(e.target.value as any)}
                  >
                    <option value="draft">Draft</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="md:col-span-3 flex items-end">
                  <Button
                    disabled={!effectiveYearId || !scope.termId || createPublication.isPending}
                    onClick={() => createPublication.mutate()}
                    className="w-full"
                  >
                    {createPublication.isPending ? 'Creating...' : 'Create Publication'}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium mb-2">Recent publications</div>
                <div className="space-y-2">
                  {(publications || []).slice(0, 20).map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p.scopeType} · {p.status}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.academicYearId || ''} {p.termId ? `· ${p.termId}` : ''} {p.classId ? `· ${p.classId}` : ''} {p.studentId ? `· ${p.studentId}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePublicationStatus.mutate({ id: p.id, status: 'draft' })}
                        >
                          Draft
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updatePublicationStatus.mutate({ id: p.id, status: 'reviewed' })}
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updatePublicationStatus.mutate({ id: p.id, status: 'published' })}
                        >
                          Publish
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!publications || publications.length === 0) && (
                    <div className="text-sm text-muted-foreground">No publications yet.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isStudentOrParent && (
          <Card>
            <CardHeader>
              <CardTitle>My Report Cards</CardTitle>
              <CardDescription>Published reports available for download</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(myReports || []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.scopeType} report</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.publishedAt ? `Published ${new Date(r.publishedAt).toLocaleString()}` : 'Published'}
                    </div>
                  </div>
                  <Button
                    onClick={() => openExport(api.sms.reports.my.downloadPdfUrl(r.id))}
                  >
                    Download PDF
                  </Button>
                </div>
              ))}
              {(!myReports || myReports.length === 0) && (
                <div className="text-sm text-muted-foreground">No published reports available yet.</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
