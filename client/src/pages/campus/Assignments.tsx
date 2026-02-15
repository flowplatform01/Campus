import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMemo, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function CampusAssignmentsPage() {
  const { user } = useRequireAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const [scope, setScope] = useState({ termId: '', classId: '', sectionId: '' });
  const [createForm, setCreateForm] = useState({ subjectId: '', title: '', instructions: '', dueAt: '', maxScore: 100, attachmentFile: null as File | null });
  const [submitState, setSubmitState] = useState<{ assignmentId: string; submissionUrl: string; submissionText: string } | null>(null);
  const [reviewAssignmentId, setReviewAssignmentId] = useState<string>('');
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { score: number; feedback: string }>>({});
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const { data: years } = useQuery({ queryKey: ['sms-academic-years'], queryFn: api.sms.academicYears.list });
  const activeYear = useMemo(() => (years || []).find((y: any) => y.isActive) ?? null, [years]);
  const { data: terms } = useQuery({
    queryKey: ['sms-terms', activeYear?.id ?? null],
    queryFn: () => api.sms.terms.list(activeYear?.id),
    enabled: !!activeYear?.id,
  });

  const { data: submissions, isLoading: isLoadingSubs } = useQuery({
    queryKey: ['sms-assignment-submissions', reviewAssignmentId || null],
    queryFn: () => api.sms.assignments.listSubmissions(reviewAssignmentId),
    enabled: !!reviewAssignmentId && isStaff,
  });

  const reviewSubmission = useMutation({
    mutationFn: (payload: { submissionId: string; score: number; feedback?: string }) =>
      api.sms.assignments.review(payload.submissionId, { score: payload.score, feedback: payload.feedback }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-assignment-submissions'] });
      toast({ title: 'Reviewed' });
    },
    onError: (e: any) => toast({ title: 'Failed to review', description: e?.message || 'Error', variant: 'destructive' }),
  });
  const { data: classes } = useQuery({ queryKey: ['sms-classes'], queryFn: () => api.sms.classes.list() });
  const { data: sections } = useQuery({ queryKey: ['sms-sections'], queryFn: () => api.sms.sections.list() });
  const { data: subjects } = useQuery({ queryKey: ['sms-subjects'], queryFn: () => api.sms.subjects.list() });

  const subjectNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of subjects || []) m[s.id] = s.name;
    return m;
  }, [subjects]);

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['sms-assignments', scope.termId || null],
    queryFn: () => api.sms.assignments.list(isStaff ? { academicYearId: activeYear?.id, termId: scope.termId } : {}),
  });

  const createAssignment = useMutation({
    mutationFn: async () => {
      let attachmentUrl: string | undefined;
      
      // Upload file if selected
      if (createForm.attachmentFile) {
        const formData = new FormData();
        formData.append('file', createForm.attachmentFile);
        formData.append('assetType', 'assignment_attachment');
        
        const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('campus_access_token')}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('File upload failed');
        }
        
        const uploadResult = await uploadResponse.json();
        attachmentUrl = uploadResult.url;
      }
      
      return api.sms.assignments.create({
        academicYearId: activeYear!.id,
        termId: scope.termId,
        classId: scope.classId,
        sectionId: scope.sectionId || undefined,
        subjectId: createForm.subjectId,
        title: createForm.title,
        instructions: createForm.instructions,
        dueAt: new Date(createForm.dueAt).toISOString(),
        maxScore: Number(createForm.maxScore),
        attachmentUrl,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-assignments'] });
      setCreateForm({ subjectId: '', title: '', instructions: '', dueAt: '', maxScore: 100, attachmentFile: null });
      toast({ title: 'Draft created' });
    },
    onError: (e: any) => toast({ title: 'Failed to create', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const publishAssignment = useMutation({
    mutationFn: (id: string) => api.sms.assignments.publish(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-assignments'] });
      toast({ title: 'Assignment published' });
    },
    onError: (e: any) => toast({ title: 'Failed to publish', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const closeAssignment = useMutation({
    mutationFn: (id: string) => api.sms.assignments.close(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-assignments'] });
      toast({ title: 'Assignment closed' });
    },
    onError: (e: any) => toast({ title: 'Failed to close', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const submitAssignment = useMutation({
    mutationFn: (payload: { assignmentId: string; submissionUrl?: string; submissionText?: string }) =>
      api.sms.assignments.submit(payload.assignmentId, { submissionUrl: payload.submissionUrl, submissionText: payload.submissionText }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-assignments'] });
      setSubmitState(null);
      toast({ title: 'Submitted' });
    },
    onError: (e: any) => toast({ title: 'Failed to submit', description: e?.message || 'Error', variant: 'destructive' }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground">Track assignments and deadlines</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>{isLoading ? 'Loading...' : `${assignments?.length || 0} assignments`}</CardDescription>
          </CardHeader>
          <CardContent>
            {isStaff && (
              <div className="grid gap-4 mb-6">
                <div className="grid gap-2">
                  <Label htmlFor="as-term">Term</Label>
                  <select
                    id="as-term"
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
                  <Label htmlFor="as-class">Class</Label>
                  <select
                    id="as-class"
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
                  <Label htmlFor="as-section">Section (optional)</Label>
                  <select
                    id="as-section"
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

                <div className="grid gap-2">
                  <Label>Subject</Label>
                  <select
                    value={createForm.subjectId}
                    onChange={(e) => setCreateForm({ ...createForm, subjectId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select subject</option>
                    {(subjects || []).map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Instructions</Label>
                  <Textarea value={createForm.instructions} onChange={(e) => setCreateForm({ ...createForm, instructions: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Due date/time</Label>
                    <Input type="datetime-local" value={createForm.dueAt} onChange={(e) => setCreateForm({ ...createForm, dueAt: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Max Score</Label>
                    <Input type="number" value={createForm.maxScore} onChange={(e) => setCreateForm({ ...createForm, maxScore: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Attachment File (optional)</Label>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    onChange={(e) => setCreateForm({ ...createForm, attachmentFile: e.target.files?.[0] || null })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  {createForm.attachmentFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {createForm.attachmentFile.name}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => createAssignment.mutate()}
                  disabled={!activeYear?.id || !scope.termId || !scope.classId || !createForm.subjectId || !createForm.title || !createForm.instructions || !createForm.dueAt || createAssignment.isPending}
                >
                  Create Draft
                </Button>

                <div className="grid gap-2">
                  <Label htmlFor="as-review">Review Submissions</Label>
                  <select
                    id="as-review"
                    value={reviewAssignmentId}
                    onChange={(e) => setReviewAssignmentId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select assignment</option>
                    {(assignments || []).map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.title} ({a.status})
                      </option>
                    ))}
                  </select>
                </div>

                {reviewAssignmentId && (
                  <div className="grid gap-3 border rounded-lg p-4">
                    <div className="font-medium">Submissions</div>
                    {isLoadingSubs && <div className="text-sm text-muted-foreground">Loading...</div>}

                    {(submissions || []).map((row: any) => {
                      const sub = row.submission;
                      const student = row.student;
                      const draft = reviewDrafts[sub.id] || { score: sub.score ?? 0, feedback: sub.feedback ?? '' };
                      return (
                        <div key={sub.id} className="grid gap-2 border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{student?.name || 'Student'}</div>
                              <div className="text-xs text-muted-foreground">{student?.studentId || student?.email || ''}</div>
                            </div>
                            <Badge variant={sub.reviewedAt ? 'default' : 'secondary'}>{sub.reviewedAt ? 'Reviewed' : 'Pending'}</Badge>
                          </div>
                          {sub.submissionText && <div className="text-sm">{sub.submissionText}</div>}
                          {sub.submissionUrl && (
                            <a className="text-sm underline" href={sub.submissionUrl} target="_blank" rel="noreferrer">
                              View submission
                            </a>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-1">
                              <Label>Score</Label>
                              <Input
                                type="number"
                                value={draft.score}
                                onChange={(e) =>
                                  setReviewDrafts({
                                    ...reviewDrafts,
                                    [sub.id]: { score: Number(e.target.value), feedback: draft.feedback },
                                  })
                                }
                              />
                            </div>
                            <div className="grid gap-1">
                              <Label>Feedback</Label>
                              <Input
                                value={draft.feedback}
                                onChange={(e) =>
                                  setReviewDrafts({
                                    ...reviewDrafts,
                                    [sub.id]: { score: draft.score, feedback: e.target.value },
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => reviewSubmission.mutate({ submissionId: sub.id, score: draft.score, feedback: draft.feedback || undefined })}
                              disabled={reviewSubmission.isPending}
                            >
                              Save Review
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {(submissions || []).length === 0 && !isLoadingSubs && (
                      <div className="text-sm text-muted-foreground">No submissions yet</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Max score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submission</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(assignments || []).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{subjectNameById[a.subjectId] || a.subjectId}</TableCell>
                    <TableCell>{new Date(a.dueAt).toLocaleString()}</TableCell>
                    <TableCell>{a.maxScore}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === 'published' ? 'default' : a.status === 'closed' ? 'secondary' : 'outline'}>
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.submitted ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit">Submitted</Badge>
                          {a.score !== null && (
                            <span className="text-xs font-medium text-green-600">
                              Score: {a.score}/{a.maxScore}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isStaff ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => publishAssignment.mutate(a.id)} disabled={publishAssignment.isPending || a.status !== 'draft'}>
                            Publish
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => closeAssignment.mutate(a.id)} disabled={closeAssignment.isPending || a.status === 'closed'}>
                            Close
                          </Button>
                        </div>
                      ) : user?.role === 'student' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => setSubmitState({ assignmentId: a.id, submissionUrl: '', submissionText: '' })}
                            disabled={a.status !== 'published' || a.submitted}
                          >
                            {a.submitted ? 'Submitted' : 'Submit'}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {submitState && (
              <div className="mt-6 grid gap-3 border rounded-lg p-4">
                <div className="font-medium">Submit Assignment</div>
                <div className="grid gap-2">
                  <Label>Submission URL (optional)</Label>
                  <Input value={submitState.submissionUrl} onChange={(e) => setSubmitState({ ...submitState, submissionUrl: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Submission Text (optional)</Label>
                  <Textarea value={submitState.submissionText} onChange={(e) => setSubmitState({ ...submitState, submissionText: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      submitAssignment.mutate({
                        assignmentId: submitState.assignmentId,
                        submissionUrl: submitState.submissionUrl || undefined,
                        submissionText: submitState.submissionText || undefined,
                      })
                    }
                    disabled={submitAssignment.isPending}
                  >
                    Submit
                  </Button>
                  <Button variant="outline" onClick={() => setSubmitState(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
