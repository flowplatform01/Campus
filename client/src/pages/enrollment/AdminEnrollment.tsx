import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, FileText, CheckCircle, Clock, AlertCircle, Settings, Eye, Edit, Trash2, UserCheck, Calendar } from 'lucide-react';

export default function AdminEnrollmentPage() {
  useRequireAuth(['admin']);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['all-applications'],
    queryFn: () => api.enrollment.admin.allApplications(),
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['enrollment-settings'],
    queryFn: () => api.enrollment.admin.settings(),
    enabled: true,
  });

  const [applicationForm, setApplicationForm] = useState({
    schoolId: '',
    academicYearId: '',
    termId: '',
    classId: '',
    sectionId: '',
    status: 'pending',
    reviewNotes: '',
  });

  const [settingsForm, setSettingsForm] = useState({
    studentApplicationsEnabled: true,
    parentApplicationsEnabled: true,
    staffApplicationsEnabled: true,
    autoApprovalEnabled: false,
    requiredDocuments: [] as string[],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const updateApplicationStatus = useMutation({
    mutationFn: ({ id, status, reviewNotes }: { id: string; status: string; reviewNotes?: string }) =>
      api.enrollment.admin.updateApplication(id, { status, reviewNotes }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['all-applications'] });
      toast({ title: 'Application updated', description: 'Application status has been updated.' });
    },
    onError: (e: any) => {
      toast({ title: 'Update failed', description: e?.message || 'Error updating application', variant: 'destructive' });
    },
  });

  const updateSettings = useMutation({
    mutationFn: () => api.enrollment.admin.updateSettings(settingsForm),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['enrollment-settings'] });
      toast({ title: 'Settings updated', description: 'Enrollment settings have been updated.' });
    },
    onError: (e: any) => {
      toast({ title: 'Update failed', description: e?.message || 'Error updating settings', variant: 'destructive' });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      case 'under_review': return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getApplicationTypeColor = (type: string) => {
    switch (type) {
      case 'student': return 'bg-blue-100 text-blue-800';
      case 'parent': return 'bg-purple-100 text-purple-800';
      case 'employee': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredApplications = (applications || []).filter((app: any) => {
    if (typeFilter && String(app.type || '') !== typeFilter) return false;
    if (statusFilter && String(app.status || '') !== statusFilter) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const applicantName = String(app.applicant?.name || app.name || '').toLowerCase();
    const schoolName = String(app.school?.name || '').toLowerCase();
    const desiredClass = String(app.desiredClass || app.class?.name || '').toLowerCase();
    const status = String(app.status || '').toLowerCase();
    const type = String(app.type || '').toLowerCase();
    const email = String(app.applicant?.email || app.email || '').toLowerCase();

    return (
      applicantName.includes(q) ||
      schoolName.includes(q) ||
      desiredClass.includes(q) ||
      status.includes(q) ||
      type.includes(q) ||
      email.includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enrollment Management</h1>
            <p className="text-muted-foreground">Manage all student, parent, and employee applications</p>
          </div>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <div className="grid gap-6">
              {/* Statistics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Applications</CardTitle>
                    <CardDescription>All applications received</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {applications?.filter((app: any) => app.type === 'student').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Student applications</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Parent Applications</CardTitle>
                    <CardDescription>Applications submitted by parents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {applications?.filter((app: any) => app.type === 'parent').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Parent applications</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Employee Applications</CardTitle>
                    <CardDescription>Job applications from employees</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {applications?.filter((app: any) => app.type === 'employee').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Employee applications</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pending Review</CardTitle>
                    <CardDescription>Applications awaiting review</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {applications?.filter((app: any) => app.status === 'under_review').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Need review</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Approved</CardTitle>
                    <CardDescription>Successfully approved applications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {applications?.filter((app: any) => app.status === 'approved').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rejected</CardTitle>
                    <CardDescription>Rejected applications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {applications?.filter((app: any) => app.status === 'rejected').length || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                  </CardContent>
                </Card>
              </div>

              {/* Applications Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Applications
                  </CardTitle>
                  <CardDescription>Review and manage all applications</CardDescription>
                </CardHeader>
                <CardContent>
                  {appsLoading ? (
                    <div className="text-center py-8">Loading applications...</div>
                  ) : applications?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No applications found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-4 mb-4">
                        <Input
                          placeholder="Search applications..."
                          className="max-w-md"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <select
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                          >
                            <option value="">All Types</option>
                            <option value="student">Student</option>
                            <option value="parent">Parent</option>
                            <option value="employee">Employee</option>
                          </select>
                          <select
                            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                          >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-2 text-xs font-medium">
                        <div className="font-semibold">Applicant</div>
                        <div className="font-semibold">Type</div>
                        <div className="font-semibold">School</div>
                        <div className="font-semibold">Class</div>
                        <div className="font-semibold">Status</div>
                        <div className="font-semibold">Applied</div>
                        <div className="font-semibold">Actions</div>
                      </div>

                      {filteredApplications.map((app: any) => (
                        <div key={app.id} className="grid grid-cols-7 gap-2 p-2 border-b">
                          <div className={getApplicationTypeColor(app.type)}>
                            <div className="font-medium">{app.applicant?.name || 'N/A'}</div>
                          </div>
                          <div className={getApplicationTypeColor(app.type)}>
                            <Badge variant="outline" className="text-xs">
                              {app.type}
                            </Badge>
                          </div>
                          <div>
                            <div className="font-medium">{app.school?.name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{app.desiredClass || 'N/A'}</div>
                          </div>
                          <div className="text-xs">{app.desiredClass || 'N/A'}</div>
                          <div className="flex items-center gap-1">
                            <Badge className={getStatusColor(app.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(app.status)}
                                {app.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </Badge>
                          </div>
                          <div className="text-xs">{new Date(app.createdAt).toLocaleDateString()}</div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setApplicationForm({
                                  ...applicationForm,
                                  schoolId: app.schoolId,
                                  academicYearId: app.academicYearId,
                                  termId: app.termId,
                                  classId: app.classId,
                                  sectionId: app.sectionId,
                                  status: app.status,
                                  reviewNotes: app.reviewNotes,
                                });
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateApplicationStatus.mutate({ id: app.id, status: 'approved' })}
                              disabled={app.status === 'approved'}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateApplicationStatus.mutate({ id: app.id, status: 'rejected' })}
                              disabled={app.status === 'rejected'}
                            >
                              <AlertCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                // Delete application logic here
                                toast({ title: 'Delete application', description: 'Application deletion not implemented yet.' });
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Enrollment Settings
                  </CardTitle>
                  <CardDescription>Configure enrollment options and requirements</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={(e) => { e.preventDefault(); updateSettings.mutate(); }} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="studentApplicationsEnabled">Student Applications</Label>
                      <select
                        id="studentApplicationsEnabled"
                        value={settingsForm.studentApplicationsEnabled.toString()}
                        onChange={(e) => setSettingsForm({ ...settingsForm, studentApplicationsEnabled: e.target.value === 'true' })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="parentApplicationsEnabled">Parent Applications</Label>
                      <select
                        id="parentApplicationsEnabled"
                        value={settingsForm.parentApplicationsEnabled.toString()}
                        onChange={(e) => setSettingsForm({ ...settingsForm, parentApplicationsEnabled: e.target.value === 'true' })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="staffApplicationsEnabled">Staff Applications</Label>
                      <select
                        id="staffApplicationsEnabled"
                        value={settingsForm.staffApplicationsEnabled.toString()}
                        onChange={(e) => setSettingsForm({ ...settingsForm, staffApplicationsEnabled: e.target.value === 'true' })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="autoApprovalEnabled">Auto-Approval</Label>
                      <select
                        id="autoApprovalEnabled"
                        value={settingsForm.autoApprovalEnabled.toString()}
                        onChange={(e) => setSettingsForm({ ...settingsForm, autoApprovalEnabled: e.target.value === 'true' })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="true">Enabled</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="requiredDocuments">Required Documents</Label>
                      <Input
                        id="requiredDocuments"
                        value={settingsForm.requiredDocuments.join(', ')}
                        onChange={(e) => setSettingsForm({ ...settingsForm, requiredDocuments: e.target.value.split(', ').map(doc => doc.trim()) })}
                        placeholder="Birth certificate, transcripts, etc."
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <Button type="submit" disabled={updateSettings.isPending} className="w-full">
                      {updateSettings.isPending ? 'Updating...' : 'Update Settings'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
