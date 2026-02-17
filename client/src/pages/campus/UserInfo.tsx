import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useParams } from 'wouter';
import { Printer } from 'lucide-react';

export default function CampusUserInfoPage() {
  useRequireAuth(['admin']);
  const params = useParams<{ id: string }>();
  const id = String((params as any)?.id || '');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-info', id],
    queryFn: () => api.users.getInfo(id),
    enabled: !!id,
  });

  const user = (data as any)?.user;
  const related = (data as any)?.related || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">User Info</h1>
            <p className="text-muted-foreground">Printable profile summary</p>
          </div>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>

        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">Failed to load user info</p>
            </CardContent>
          </Card>
        )}

        {user && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{user.role}</Badge>
                  {user.subRole ? <Badge variant="secondary" className="capitalize">{user.subRole}</Badge> : null}
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Phone</span><span>{user.phone || '-'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Student ID</span><span>{user.studentId || '-'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Employee ID</span><span>{user.employeeId || '-'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Grade</span><span>{user.grade || '-'}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Class Section</span><span>{user.classSection || '-'}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Related</CardTitle>
                <CardDescription>Role-based links and assignments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {user.role === 'parent' && (
                  <div>
                    <div className="font-medium mb-2">Children</div>
                    {(related.children || []).length > 0 ? (
                      <div className="space-y-2">
                        {(related.children || []).map((c: any) => (
                          <div key={c.id} className="flex justify-between gap-4">
                            <span>{c.name}</span>
                            <span className="text-muted-foreground">{c.studentId || '-'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No linked children</p>
                    )}
                  </div>
                )}

                {user.role === 'student' && (
                  <div>
                    <div className="font-medium mb-2">Enrollment</div>
                    {related.enrollment ? (
                      <div className="grid gap-2">
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Class</span><span>{related.enrollment.className || '-'}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Section</span><span>{related.enrollment.sectionName || '-'}</span></div>
                        <div className="flex justify-between gap-4"><span className="text-muted-foreground">Status</span><span className="capitalize">{related.enrollment.status || '-'}</span></div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No enrollment record</p>
                    )}
                  </div>
                )}

                {user.role === 'employee' && (
                  <div>
                    <div className="font-medium mb-2">Teaching Subjects</div>
                    {(related.teaching || []).length > 0 ? (
                      <div className="space-y-2">
                        {(related.teaching || []).map((s: any) => (
                          <div key={s.subjectId} className="flex justify-between gap-4">
                            <span>{s.subjectName}</span>
                            <span className="text-muted-foreground">{s.subjectCode || '-'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No subject assignments</p>
                    )}
                  </div>
                )}

                {user.role === 'admin' && (
                  <p className="text-muted-foreground">No additional related data for admins.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
