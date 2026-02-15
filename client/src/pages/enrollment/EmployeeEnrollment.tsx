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
import { Search, Briefcase, FileText, CheckCircle, Clock, AlertCircle, Upload } from 'lucide-react';

export default function EmployeeEnrollmentPage() {
  useRequireAuth(['employee']);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: schools, isLoading: schoolsLoading } = useQuery({
    queryKey: ['schools-for-employee-enrollment'],
    queryFn: () => api.enrollment.schools.search(),
  });

  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['my-job-applications'],
    queryFn: () => api.enrollment.employee.myApplications(),
  });

  const [applicationForm, setApplicationForm] = useState({
    schoolId: '',
    desiredSubRole: '',
    experience: '',
    qualifications: '',
    previousEmployment: '',
    references: '',
    coverLetter: '',
    documents: [] as File[],
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredSchools = schools?.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    school.staffApplicationsAllowed
  ) || [];

  const submitApplication = useMutation({
    mutationFn: () => api.enrollment.employee.apply({
      ...applicationForm,
      documents: applicationForm.documents.map(doc => doc.name),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['my-job-applications'] });
      setApplicationForm({
        schoolId: '',
        desiredSubRole: '',
        experience: '',
        qualifications: '',
        previousEmployment: '',
        references: '',
        coverLetter: '',
        documents: [],
      });
      toast({ title: 'Application submitted', description: 'Your job application has been submitted for review.' });
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
      case 'interview_scheduled': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      case 'under_review': return <Clock className="h-4 w-4" />;
      case 'interview_scheduled': return <Briefcase className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Employee Enrollment</h1>
            <p className="text-muted-foreground">Apply for teaching and staff positions at schools</p>
          </div>
        </div>

        <Tabs defaultValue="apply" className="space-y-6">
          <TabsList>
            <TabsTrigger value="apply">Apply to School</TabsTrigger>
            <TabsTrigger value="applications">My Applications</TabsTrigger>
          </TabsList>

          <TabsContent value="apply">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Find Schools
                  </CardTitle>
                  <CardDescription>Search for schools with job openings</CardDescription>
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
                                <Badge variant={school.staffApplicationsAllowed ? 'default' : 'secondary'}>
                                  {school.staffApplicationsAllowed ? 'Staff Applications Open' : 'Closed'}
                                </Badge>
                                {school.type && (
                                  <Badge variant="outline">{school.type}</Badge>
                                )}
                              </div>
                              {school.openPositions && school.openPositions.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium">Open Positions:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {school.openPositions.map((position: string, index: number) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {position}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button
                              onClick={() => setApplicationForm({ ...applicationForm, schoolId: school.id })}
                              disabled={!school.staffApplicationsAllowed}
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
                    Job Application
                  </CardTitle>
                  <CardDescription>Complete your job application details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!applicationForm.schoolId ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Please select a school first
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); submitApplication.mutate(); }} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="desiredSubRole">Desired Position</Label>
                        <select
                          id="desiredSubRole"
                          value={applicationForm.desiredSubRole}
                          onChange={(e) => setApplicationForm({ ...applicationForm, desiredSubRole: e.target.value })}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        >
                          <option value="">Select position</option>
                          <option value="teacher">Teacher</option>
                          <option value="accountant">Accountant</option>
                          <option value="principal">Principal</option>
                          <option value="bursar">Bursar</option>
                          <option value="admin">Admin</option>
                          <option value="librarian">Librarian</option>
                          <option value="counselor">Counselor</option>
                          <option value="security">Security</option>
                          <option value="cleaner">Cleaner</option>
                          <option value="driver">Driver</option>
                          <option value="it_support">IT Support</option>
                          <option value="lab_assistant">Lab Assistant</option>
                          <option value="sports_coach">Sports Coach</option>
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="experience">Years of Experience</Label>
                        <Input
                          id="experience"
                          type="number"
                          value={applicationForm.experience}
                          onChange={(e) => setApplicationForm({ ...applicationForm, experience: e.target.value })}
                          placeholder="Number of years"
                          min="0"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="qualifications">Qualifications</Label>
                        <textarea
                          id="qualifications"
                          value={applicationForm.qualifications}
                          onChange={(e) => setApplicationForm({ ...applicationForm, qualifications: e.target.value })}
                          placeholder="Degrees, certifications, etc."
                          rows={3}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="previousEmployment">Previous Employment (optional)</Label>
                        <textarea
                          id="previousEmployment"
                          value={applicationForm.previousEmployment}
                          onChange={(e) => setApplicationForm({ ...applicationForm, previousEmployment: e.target.value })}
                          placeholder="Previous relevant work experience"
                          rows={2}
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="references">References (optional)</Label>
                        <textarea
                          id="references"
                          value={applicationForm.references}
                          onChange={(e) => setApplicationForm({ ...applicationForm, references: e.target.value })}
                          placeholder="Professional references"
                          rows={2}
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="coverLetter">Cover Letter</Label>
                        <textarea
                          id="coverLetter"
                          value={applicationForm.coverLetter}
                          onChange={(e) => setApplicationForm({ ...applicationForm, coverLetter: e.target.value })}
                          placeholder="Why you want to work at this school"
                          rows={4}
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="documents">Documents</Label>
                        <div className="space-y-2">
                          <Input
                            id="documents"
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => setApplicationForm({ ...applicationForm, documents: Array.from(e.target.files || []) })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Upload CV, certificates, and other relevant documents (PDF, DOC, DOCX)
                          </p>
                        </div>
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

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>My Job Applications</CardTitle>
                <CardDescription>Track the status of your job applications</CardDescription>
              </CardHeader>
              <CardContent>
                {appsLoading ? (
                  <div className="text-center py-8">Loading applications...</div>
                ) : applications?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    You haven't submitted any job applications yet
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
                          String(app.school?.name || '').toLowerCase().includes(q) ||
                          String(app.desiredSubRole || '').toLowerCase().includes(q) ||
                          String(app.status || '').toLowerCase().includes(q) ||
                          String(app.experience || '').toLowerCase().includes(q)
                        );
                      })
                      .map((app: any) => (
                      <div key={app.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{app.school?.name}</h3>
                              <span className="text-sm text-muted-foreground">→ {app.desiredSubRole}</span>
                              <Badge className={getStatusColor(app.status)}>
                                <span className="flex items-center gap-1">
                                  {getStatusIcon(app.status)}
                                  {app.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                            <p className="text-sm">Experience: {app.experience} years</p>
                            {app.interviewDate && (
                              <p className="text-sm">Interview: {new Date(app.interviewDate).toLocaleDateString()}</p>
                            )}
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
