import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function CampusAdminSetupPage() {
  useRequireAuth(['admin']);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: schoolProfile } = useQuery({
    queryKey: ['sms-school'],
    queryFn: api.sms.school.get,
  });

  const [brandingForm, setBrandingForm] = useState({
    name: '',
    logoUrl: '',
    address: '',
    phone: '',
    email: '',
  });

  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (!schoolProfile) return;
    setBrandingForm({
      name: schoolProfile?.name ?? '',
      logoUrl: schoolProfile?.logoUrl ?? '',
      address: schoolProfile?.address ?? '',
      phone: schoolProfile?.phone ?? '',
      email: schoolProfile?.email ?? '',
    });
  }, [schoolProfile]);

  const saveBranding = useMutation({
    mutationFn: () => {
      const patch: any = {};
      if (brandingForm.name && brandingForm.name !== schoolProfile?.name) patch.name = brandingForm.name;
      if (brandingForm.logoUrl !== (schoolProfile?.logoUrl ?? '')) patch.logoUrl = brandingForm.logoUrl;
      if (brandingForm.address !== (schoolProfile?.address ?? '')) patch.address = brandingForm.address;
      if (brandingForm.phone !== (schoolProfile?.phone ?? '')) patch.phone = brandingForm.phone;
      if (brandingForm.email && brandingForm.email !== schoolProfile?.email) patch.email = brandingForm.email;
      return api.sms.school.update(patch);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-school'] });
      toast({ title: 'School branding updated' });
    },
    onError: (e: any) => toast({ title: 'Failed to update', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/upload/school-logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('campus_access_token')}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Upload failed');
      if (!data?.url) throw new Error('Upload did not return a URL');

      await api.sms.school.update({ logoUrl: data.url });
      await qc.invalidateQueries({ queryKey: ['sms-school'] });
      setBrandingForm((prev) => ({ ...prev, logoUrl: data.url }));
      toast({ title: 'Logo updated' });
    } catch (e: any) {
      toast({ title: 'Logo upload failed', description: e?.message || 'Error', variant: 'destructive' });
    } finally {
      setLogoUploading(false);
    }
  };

  const { data: academicYears, isLoading: yearsLoading } = useQuery({
    queryKey: ['sms-academic-years'],
    queryFn: api.sms.academicYears.list,
  });

  const createAdmission = useMutation({
    mutationFn: (payload: {
      academicYearId: string;
      classId: string;
      sectionId?: string;
      studentFullName: string;
      studentEmail?: string;
      desiredStudentId?: string;
      parentFullName?: string;
      parentEmail?: string;
      notes?: string;
    }) => api.sms.admissions.create(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-admissions'] });
      setAdmissionForm({
        academicYearId: '',
        classId: '',
        sectionId: '',
        studentFullName: '',
        studentEmail: '',
        desiredStudentId: '',
        parentFullName: '',
        parentEmail: '',
        notes: '',
      });
      toast({ title: 'Admission submitted' });
    },
    onError: (e: any) => toast({ title: 'Failed to submit admission', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const approveAdmission = useMutation({
    mutationFn: (id: string) => api.sms.admissions.approve(id),
    onSuccess: async (data: any) => {
      await qc.invalidateQueries({ queryKey: ['sms-admissions'] });
      const studentPass = data?.student?.tempPassword;
      const parentPass = data?.parent?.tempPassword;
      const detail = [
        studentPass ? `Student password: ${studentPass}` : null,
        parentPass ? `Parent password: ${parentPass}` : null,
      ].filter(Boolean).join(' | ');
      toast({ title: 'Admission approved', description: detail || 'Accounts linked and enrolled.' });
    },
    onError: (e: any) => toast({ title: 'Failed to approve admission', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const createSubRole = useMutation({
    mutationFn: (payload: { key: string; name: string }) => api.sms.subRoles.create(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-sub-roles'] });
      setSubRoleForm({ key: '', name: '' });
      toast({ title: 'Sub-role created' });
    },
    onError: (e: any) => toast({ title: 'Failed to create sub-role', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const deleteSubRole = useMutation({
    mutationFn: (id: string) => api.sms.subRoles.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-sub-roles'] });
      setSelectedSubRoleId('');
      setGrantKeys([]);
      toast({ title: 'Sub-role deleted' });
    },
    onError: (e: any) => toast({ title: 'Failed to delete sub-role', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const saveGrants = useMutation({
    mutationFn: (payload: { subRoleId: string; permissionKeys: string[] }) => api.sms.subRoleGrants.set(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-sub-role-grants'] });
      toast({ title: 'Permissions updated' });
    },
    onError: (e: any) => toast({ title: 'Failed to update permissions', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const activeYear = useMemo(() => academicYears?.find((y: any) => y.isActive) ?? null, [academicYears]);

  const { data: terms } = useQuery({
    queryKey: ['sms-terms', activeYear?.id ?? null],
    queryFn: () => api.sms.terms.list(activeYear?.id),
    enabled: !!activeYear?.id,
  });

  const { data: classes } = useQuery({
    queryKey: ['sms-classes'],
    queryFn: api.sms.classes.list,
  });

  const { data: subjects } = useQuery({
    queryKey: ['sms-subjects'],
    queryFn: api.sms.subjects.list,
  });

  const { data: admissions } = useQuery({
    queryKey: ['sms-admissions'],
    queryFn: api.sms.admissions.list,
  });

  const { data: permissions } = useQuery({
    queryKey: ['sms-permissions'],
    queryFn: api.sms.permissions.list,
  });

  const { data: subRoles } = useQuery({
    queryKey: ['sms-sub-roles'],
    queryFn: api.sms.subRoles.list,
  });

  const [selectedSubRoleId, setSelectedSubRoleId] = useState<string>('');
  const { data: subRoleGrants } = useQuery({
    queryKey: ['sms-sub-role-grants', selectedSubRoleId || null],
    queryFn: () => api.sms.subRoleGrants.list(selectedSubRoleId || undefined),
    enabled: !!selectedSubRoleId,
  });

  const [yearForm, setYearForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });

  const [termForm, setTermForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const [classForm, setClassForm] = useState({ name: '', sortOrder: 0 });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '' });

  const [admissionForm, setAdmissionForm] = useState({
    academicYearId: '',
    classId: '',
    sectionId: '',
    studentFullName: '',
    studentEmail: '',
    desiredStudentId: '',
    parentFullName: '',
    parentEmail: '',
    notes: '',
  });

  const [subRoleForm, setSubRoleForm] = useState({ key: '', name: '' });
  const [grantKeys, setGrantKeys] = useState<string[]>([]);

  const createYear = useMutation({
    mutationFn: () => api.sms.academicYears.create(yearForm),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-academic-years'] });
      setYearForm({ name: '', startDate: '', endDate: '', isActive: true });
      toast({ title: 'Academic year created' });
    },
    onError: (e: any) => toast({ title: 'Failed to create academic year', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const setActiveYear = useMutation({
    mutationFn: (id: string) => api.sms.academicYears.setActive(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-academic-years'] });
      toast({ title: 'Active year updated' });
    },
    onError: (e: any) => toast({ title: 'Failed to update year', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const deleteYear = useMutation({
    mutationFn: (id: string) => api.sms.academicYears.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-academic-years'] });
      toast({ title: 'Academic year deleted' });
    },
    onError: (e: any) => toast({ title: 'Failed to delete year', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const createTerm = useMutation({
    mutationFn: () =>
      api.sms.terms.create({
        academicYearId: activeYear?.id,
        name: termForm.name,
        startDate: termForm.startDate,
        endDate: termForm.endDate,
      } as any),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-terms'] });
      setTermForm({ name: '', startDate: '', endDate: '' });
      toast({ title: 'Term created' });
    },
    onError: (e: any) => toast({ title: 'Failed to create term', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const deleteTerm = useMutation({
    mutationFn: (id: string) => api.sms.terms.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-terms'] });
      toast({ title: 'Term deleted' });
    },
    onError: (e: any) => toast({ title: 'Failed to delete term', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const createClass = useMutation({
    mutationFn: () => api.sms.classes.create(classForm),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-classes'] });
      setClassForm({ name: '', sortOrder: 0 });
      toast({ title: 'Class created' });
    },
    onError: (e: any) => toast({ title: 'Failed to create class', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const deleteClass = useMutation({
    mutationFn: (id: string) => api.sms.classes.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-classes'] });
      toast({ title: 'Class deleted' });
    },
    onError: (e: any) => toast({ title: 'Failed to delete class', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const createSubject = useMutation({
    mutationFn: () => api.sms.subjects.create({ name: subjectForm.name, code: subjectForm.code || undefined }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-subjects'] });
      setSubjectForm({ name: '', code: '' });
      toast({ title: 'Subject created' });
    },
    onError: (e: any) => toast({ title: 'Failed to create subject', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const deleteSubject = useMutation({
    mutationFn: (id: string) => api.sms.subjects.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-subjects'] });
      toast({ title: 'Subject deleted' });
    },
    onError: (e: any) => toast({ title: 'Failed to delete subject', description: e?.message || 'Error', variant: 'destructive' }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">School Setup</h1>
          <p className="text-muted-foreground">Configure your school’s academic structure (Eskooly-style foundation)</p>
        </div>

        <Tabs defaultValue="years">
          <TabsList>
            <TabsTrigger value="years">Academic Years</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="admissions">Admissions</TabsTrigger>
            <TabsTrigger value="staff">Staff & Permissions</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
          </TabsList>

          <TabsContent value="years" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Academic Year</CardTitle>
                <CardDescription>Everything (attendance, exams, results) must be tied to an academic year.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="year-name">Name</Label>
                  <Input id="year-name" value={yearForm.name} onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })} placeholder="2025/2026" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year-start">Start Date (ISO)</Label>
                  <Input id="year-start" value={yearForm.startDate} onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })} placeholder="2025-09-01T00:00:00.000Z" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year-end">End Date (ISO)</Label>
                  <Input id="year-end" value={yearForm.endDate} onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })} placeholder="2026-07-01T00:00:00.000Z" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => createYear.mutate()} disabled={createYear.isPending}>Create</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Academic Years</CardTitle>
                <CardDescription>Select an active year. Only one can be active at a time.</CardDescription>
              </CardHeader>
              <CardContent>
                {yearsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(academicYears || []).map((y: any) => (
                        <TableRow key={y.id}>
                          <TableCell className="font-medium">{y.name}</TableCell>
                          <TableCell>{new Date(y.startDate).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(y.endDate).toLocaleDateString()}</TableCell>
                          <TableCell>{y.isActive ? 'Yes' : 'No'}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" onClick={() => setActiveYear.mutate(y.id)} disabled={y.isActive || setActiveYear.isPending}>Set Active</Button>
                            <Button variant="destructive" onClick={() => deleteYear.mutate(y.id)} disabled={deleteYear.isPending}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Term</CardTitle>
                <CardDescription>Terms/Semesters must belong to the active academic year.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {!activeYear ? (
                  <div className="text-sm text-muted-foreground">Set an active academic year first.</div>
                ) : (
                  <>
                    <div className="text-sm">Active Year: <span className="font-medium">{activeYear.name}</span></div>
                    <div className="grid gap-2">
                      <Label htmlFor="term-name">Name</Label>
                      <Input id="term-name" value={termForm.name} onChange={(e) => setTermForm({ ...termForm, name: e.target.value })} placeholder="Term 1" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="term-start">Start Date (ISO)</Label>
                      <Input id="term-start" value={termForm.startDate} onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })} placeholder="2025-09-01T00:00:00.000Z" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="term-end">End Date (ISO)</Label>
                      <Input id="term-end" value={termForm.endDate} onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })} placeholder="2025-12-20T00:00:00.000Z" />
                    </div>
                    <Button onClick={() => createTerm.mutate()} disabled={createTerm.isPending}>Create Term</Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Terms</CardTitle>
                <CardDescription>{activeYear ? `For ${activeYear.name}` : 'No active year set'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(terms || []).map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{new Date(t.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(t.endDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="destructive" onClick={() => deleteTerm.mutate(t.id)} disabled={deleteTerm.isPending}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Class</CardTitle>
                <CardDescription>Classes/Grades are the backbone of enrollment, timetables, and attendance.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="class-name">Name</Label>
                  <Input id="class-name" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="Grade 10" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="class-order">Sort Order</Label>
                  <Input id="class-order" type="number" value={classForm.sortOrder} onChange={(e) => setClassForm({ ...classForm, sortOrder: Number(e.target.value) })} />
                </div>
                <Button onClick={() => createClass.mutate()} disabled={createClass.isPending}>Create Class</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Sort</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(classes || []).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.sortOrder}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="destructive" onClick={() => deleteClass.mutate(c.id)} disabled={deleteClass.isPending}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Subject</CardTitle>
                <CardDescription>Subjects will later be assigned to teachers and tied to exams/results.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="subject-name">Name</Label>
                  <Input id="subject-name" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="Mathematics" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subject-code">Code (optional)</Label>
                  <Input id="subject-code" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} placeholder="MATH" />
                </div>
                <Button onClick={() => createSubject.mutate()} disabled={createSubject.isPending}>Create Subject</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subjects</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(subjects || []).map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.code || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="destructive" onClick={() => deleteSubject.mutate(s.id)} disabled={deleteSubject.isPending}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>New Admission</CardTitle>
                <CardDescription>Submit an admission and approve it to create accounts + enrollment.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="adm-year">Academic Year</Label>
                  <select
                    id="adm-year"
                    value={admissionForm.academicYearId}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, academicYearId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select year</option>
                    {(academicYears || []).map((y: any) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adm-class">Class</Label>
                  <select
                    id="adm-class"
                    value={admissionForm.classId}
                    onChange={(e) => setAdmissionForm({ ...admissionForm, classId: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select class</option>
                    {(classes || []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adm-student">Student Full Name</Label>
                  <Input id="adm-student" value={admissionForm.studentFullName} onChange={(e) => setAdmissionForm({ ...admissionForm, studentFullName: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adm-student-email">Student Email (optional)</Label>
                  <Input id="adm-student-email" value={admissionForm.studentEmail} onChange={(e) => setAdmissionForm({ ...admissionForm, studentEmail: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adm-student-id">Desired Student ID (optional)</Label>
                  <Input id="adm-student-id" value={admissionForm.desiredStudentId} onChange={(e) => setAdmissionForm({ ...admissionForm, desiredStudentId: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adm-parent">Parent Full Name (optional)</Label>
                  <Input id="adm-parent" value={admissionForm.parentFullName} onChange={(e) => setAdmissionForm({ ...admissionForm, parentFullName: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adm-parent-email">Parent Email (optional)</Label>
                  <Input id="adm-parent-email" value={admissionForm.parentEmail} onChange={(e) => setAdmissionForm({ ...admissionForm, parentEmail: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adm-notes">Notes (optional)</Label>
                  <Input id="adm-notes" value={admissionForm.notes} onChange={(e) => setAdmissionForm({ ...admissionForm, notes: e.target.value })} />
                </div>
                <Button
                  onClick={() =>
                    createAdmission.mutate({
                      academicYearId: admissionForm.academicYearId,
                      classId: admissionForm.classId,
                      sectionId: admissionForm.sectionId || undefined,
                      studentFullName: admissionForm.studentFullName,
                      studentEmail: admissionForm.studentEmail || undefined,
                      desiredStudentId: admissionForm.desiredStudentId || undefined,
                      parentFullName: admissionForm.parentFullName || undefined,
                      parentEmail: admissionForm.parentEmail || undefined,
                      notes: admissionForm.notes || undefined,
                    })
                  }
                  disabled={createAdmission.isPending}
                >
                  Submit Admission
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Admissions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(admissions || []).map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.studentFullName}</TableCell>
                        <TableCell>{a.status}</TableCell>
                        <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            onClick={() => approveAdmission.mutate(a.id)}
                            disabled={approveAdmission.isPending || a.status !== 'submitted'}
                          >
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Employee Sub-Roles</CardTitle>
                <CardDescription>Create sub-roles like Principal, Secretary, Accountant, Librarian… and assign permissions.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sr-key">Key</Label>
                    <Input id="sr-key" value={subRoleForm.key} onChange={(e) => setSubRoleForm({ ...subRoleForm, key: e.target.value })} placeholder="accountant" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sr-name">Name</Label>
                    <Input id="sr-name" value={subRoleForm.name} onChange={(e) => setSubRoleForm({ ...subRoleForm, name: e.target.value })} placeholder="Accountant" />
                  </div>
                </div>
                <Button
                  onClick={() => createSubRole.mutate({ key: subRoleForm.key, name: subRoleForm.name })}
                  disabled={createSubRole.isPending}
                >
                  Create Sub-Role
                </Button>

                <div className="grid gap-2">
                  <Label htmlFor="sr-select">Select Sub-Role</Label>
                  <select
                    id="sr-select"
                    value={selectedSubRoleId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedSubRoleId(id);
                      setGrantKeys([]);
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {(subRoles || []).map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.key})</option>
                    ))}
                  </select>
                </div>

                {selectedSubRoleId && (
                  <>
                    <div className="grid gap-2">
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-auto border rounded-md p-3">
                        {(permissions || []).map((p: any) => {
                          const checked = grantKeys.includes(p.key);
                          return (
                            <label key={p.key} className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? Array.from(new Set([...grantKeys, p.key]))
                                    : grantKeys.filter((k) => k !== p.key);
                                  setGrantKeys(next);
                                }}
                              />
                              <span>
                                <span className="font-medium">{p.label}</span>
                                <span className="block text-muted-foreground">{p.key}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const keys = (subRoleGrants || []).map((g: any) => g.permissionKey);
                            setGrantKeys(keys);
                          }}
                          disabled={!subRoleGrants}
                        >
                          Load Current
                        </Button>
                        <Button onClick={() => saveGrants.mutate({ subRoleId: selectedSubRoleId, permissionKeys: grantKeys })} disabled={saveGrants.isPending}>Save</Button>
                        <Button variant="destructive" onClick={() => deleteSubRole.mutate(selectedSubRoleId)} disabled={deleteSubRole.isPending}>Delete Sub-Role</Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>School Identity & Branding</CardTitle>
                <CardDescription>These details represent your school in announcements and official posts.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>School Name</Label>
                  <Input
                    value={brandingForm.name || schoolProfile?.name || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>School Logo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={logoUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadLogo(file);
                      e.currentTarget.value = '';
                    }}
                  />
                  <Input value={brandingForm.logoUrl || schoolProfile?.logoUrl || ''} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input
                    value={brandingForm.address || schoolProfile?.address || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={brandingForm.phone || schoolProfile?.phone || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={brandingForm.email || schoolProfile?.email || ''}
                    onChange={(e) => setBrandingForm({ ...brandingForm, email: e.target.value })}
                  />
                </div>
                <Button onClick={() => saveBranding.mutate()} disabled={saveBranding.isPending}>
                  {saveBranding.isPending ? 'Saving...' : 'Save Branding'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
