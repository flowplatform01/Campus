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
import { Search, Users, FileText, Plus, CheckCircle, Clock, AlertCircle, Baby } from 'lucide-react';

export default function ParentEnrollmentPage() {
  useRequireAuth(['parent']);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: schools, isLoading: schoolsLoading } = useQuery({
    queryKey: ['schools-for-parent-enrollment'],
    queryFn: () => api.enrollment.schools.search(),
  });

  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: api.enrollment.parent.myChildren,
  });

  const childrenList = Array.isArray(children) ? children : (children as any)?.pending || [];

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['parent-applications'],
    queryFn: api.enrollment.parent.myApplications,
  });

  const [childForm, setChildForm] = useState({
    name: '',
    dateOfBirth: '',
    previousSchool: '',
    previousClass: '',
    medicalInfo: '',
    documents: [] as File[],
  });

  const [applicationForm, setApplicationForm] = useState({
    childId: '',
    schoolId: '',
    classId: '',
    documents: [] as File[],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('register');

  const filteredSchools = schools?.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    school.parentApplicationsAllowed
  ) || [];

  const registerChild = useMutation({
    mutationFn: () => api.enrollment.parent.registerChild({
      ...childForm,
      documents: childForm.documents.map(doc => doc.name),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-children'] });
      setChildForm({
        name: '',
        dateOfBirth: '',
        previousSchool: '',
        previousClass: '',
        medicalInfo: '',
        documents: [],
      });
      toast({ title: 'Child registered', description: 'Your child has been registered successfully.' });
    },
    onError: (e: any) => {
      toast({ title: 'Registration failed', description: e?.message || 'Error registering child', variant: 'destructive' });
    },
  });

  const submitApplication = useMutation({
    mutationFn: () => api.enrollment.parent.applyForChild({
      ...applicationForm,
      documents: applicationForm.documents.map(doc => doc.name),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['parent-applications'] });
      setApplicationForm({
        childId: '',
        schoolId: '',
        classId: '',
        documents: [],
      });
      toast({ title: 'Application submitted', description: 'Application has been submitted for review.' });
    },
    onError: (e: any) => {
      toast({ title: 'Application failed', description: e?.message || 'Error submitting application', variant: 'destructive' });
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Parent Enrollment</h1>
            <p className="text-muted-foreground">Register children and apply for school admission</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="register">Register Child</TabsTrigger>
            <TabsTrigger value="apply">Apply to School</TabsTrigger>
            <TabsTrigger value="children">My Children</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Baby className="h-5 w-5" />
                  Register New Child
                </CardTitle>
                <CardDescription>Add your child to the system for school applications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); registerChild.mutate(); }} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Child's Full Name</Label>
                    <Input
                      id="name"
                      value={childForm.name}
                      onChange={(e) => setChildForm({ ...childForm, name: e.target.value })}
                      placeholder="Enter child's full name"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={childForm.dateOfBirth}
                      onChange={(e) => setChildForm({ ...childForm, dateOfBirth: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="previousSchool">Previous School (optional)</Label>
                    <Input
                      id="previousSchool"
                      value={childForm.previousSchool}
                      onChange={(e) => setChildForm({ ...childForm, previousSchool: e.target.value })}
                      placeholder="Previous school name"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="previousClass">Previous Class (optional)</Label>
                    <Input
                      id="previousClass"
                      value={childForm.previousClass}
                      onChange={(e) => setChildForm({ ...childForm, previousClass: e.target.value })}
                      placeholder="Previous grade/class"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="medicalInfo">Medical Information (optional)</Label>
                    <textarea
                      id="medicalInfo"
                      value={childForm.medicalInfo}
                      onChange={(e) => setChildForm({ ...childForm, medicalInfo: e.target.value })}
                      placeholder="Any medical conditions or allergies"
                      rows={2}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="documents">Supporting Documents</Label>
                    <Input
                      id="documents"
                      type="file"
                      multiple
                      onChange={(e) => setChildForm({ ...childForm, documents: Array.from(e.target.files || []) })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <Button type="submit" disabled={registerChild.isPending} className="w-full">
                    {registerChild.isPending ? 'Registering...' : 'Register Child'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="apply">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Find Schools
                  </CardTitle>
                  <CardDescription>Search for schools accepting parent applications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search schools..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {schoolsLoading ? (
                      <div className="text-center py-8">Loading schools...</div>
                    ) : filteredSchools.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No schools found matching your search
                      </div>
                    ) : (
                      filteredSchools.map((school: any) => (
                        <div key={school.id} className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{school.name}</h3>
                              <p className="text-sm text-muted-foreground">{school.address}</p>
                              <p className="text-sm">{school.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={school.parentApplicationsAllowed ? 'default' : 'secondary'}>
                                  {school.parentApplicationsAllowed ? 'Parent Applications Allowed' : 'Not Allowed'}
                                </Badge>
                                {school.type && (
                                  <Badge variant="outline">{school.type}</Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => setApplicationForm({ ...applicationForm, schoolId: school.id })}
                              disabled={!school.parentApplicationsAllowed}
                              variant="outline"
                              size="sm"
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Application Form
                  </CardTitle>
                  <CardDescription>Submit application for your child</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!applicationForm.schoolId ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Please select a school first
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); submitApplication.mutate(); }} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="childId">Select Child</Label>
                        <select
                          id="childId"
                          value={applicationForm.childId}
                          onChange={(e) => setApplicationForm({ ...applicationForm, childId: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select child</option>
                          {childrenList?.map((child: any) => (
                            <option key={child.id} value={child.id}>
                              {child.name} ({child.dateOfBirth})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="classId">Desired Class</Label>
                        <select
                          id="classId"
                          value={applicationForm.classId}
                          onChange={(e) => setApplicationForm({ ...applicationForm, classId: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select class</option>
                          <option value="grade1">Grade 1</option>
                          <option value="grade2">Grade 2</option>
                          <option value="grade3">Grade 3</option>
                          <option value="grade4">Grade 4</option>
                          <option value="grade5">Grade 5</option>
                          <option value="grade6">Grade 6</option>
                          <option value="grade7">Grade 7</option>
                          <option value="grade8">Grade 8</option>
                          <option value="grade9">Grade 9</option>
                          <option value="grade10">Grade 10</option>
                          <option value="grade11">Grade 11</option>
                          <option value="grade12">Grade 12</option>
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="documents">Additional Documents</Label>
                        <Input
                          id="documents"
                          type="file"
                          multiple
                          onChange={(e) => setApplicationForm({ ...applicationForm, documents: Array.from(e.target.files || []) })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <Button type="submit" disabled={submitApplication.isPending} className="w-full">
                        {submitApplication.isPending ? 'Submitting...' : 'Submit Application'}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="children">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  My Children
                </CardTitle>
                <CardDescription>Manage your registered children</CardDescription>
              </CardHeader>
              <CardContent>
                {childrenLoading ? (
                  <div className="text-center py-8">Loading children...</div>
                ) : children?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    You haven't registered any children yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {childrenList.map((child: any) => (
                      <div key={child.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{child.name}</h3>
                            <p className="text-sm text-muted-foreground">Date of Birth: {child.dateOfBirth}</p>
                            {child.previousSchool && (
                              <p className="text-sm">Previous School: {child.previousSchool}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={child.isActive ? 'default' : 'secondary'}>
                                {child.isActive ? 'Active Student' : 'Registered'}
                              </Badge>
                              {child.currentSchool && (
                                <Badge variant="outline">{child.currentSchool}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>My Applications</CardTitle>
                <CardDescription>Track the status of your children's applications</CardDescription>
              </CardHeader>
              <CardContent>
                {appsLoading ? (
                  <div className="text-center py-8">Loading applications...</div>
                ) : applications?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    You haven't submitted any applications yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search applications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {applications
                      .filter((app: any) => {
                        const q = searchTerm.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          String(app.child?.name || '').toLowerCase().includes(q) ||
                          String(app.school?.name || '').toLowerCase().includes(q) ||
                          String(app.desiredClass || '').toLowerCase().includes(q) ||
                          String(app.status || '').toLowerCase().includes(q)
                        );
                      })
                      .map((app: any) => (
                      <div key={app.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{app.child?.name}</h3>
                              <span className="text-sm text-muted-foreground">→ {app.school?.name}</span>
                              <Badge className={getStatusColor(app.status)}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(app.status)}
                                  {app.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                            <p className="text-sm">Desired Class: {app.desiredClass}</p>
                            {app.reviewNotes && (
                              <p className="text-sm mt-2 p-2 bg-yellow-50 rounded">Notes: {app.reviewNotes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
