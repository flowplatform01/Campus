import { useMutation, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, TrendingUp, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CampusPromotionsPage() {
  const { user } = useRequireAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  const { data: years } = useQuery({ queryKey: ['sms-academic-years'], queryFn: api.sms.academicYears.list });
  const activeYear = useMemo(() => (years || []).find((y: any) => y.isActive) ?? null, [years]);
  const nextYear = useMemo(() => {
    if (!activeYear) return null;
    // Simple logic to find the next year by start date
    return (years || [])
      .filter((y: any) => new Date(y.startDate) > new Date(activeYear.startDate))
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;
  }, [years, activeYear]);

  const [scope, setScope] = useState({ 
    currentClassId: '', 
    currentSectionId: '',
    nextClassId: '' 
  });

  const { data: classes } = useQuery({ queryKey: ['sms-classes'], queryFn: api.sms.classes.list });
  const { data: sections } = useQuery({ queryKey: ['sms-sections', scope.currentClassId], queryFn: () => api.sms.sections.list(scope.currentClassId || undefined) });

  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['sms-promotion-students', activeYear?.id, scope.currentClassId, scope.currentSectionId],
    queryFn: () => api.sms.attendance.roster({ 
      academicYearId: activeYear!.id, 
      classId: scope.currentClassId, 
      sectionId: scope.currentSectionId || undefined 
    }),
    enabled: !!activeYear?.id && !!scope.currentClassId
  });

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const promoteMutation = useMutation({
    mutationFn: () => api.sms.promotions.promote({
      currentAcademicYearId: activeYear!.id,
      nextAcademicYearId: nextYear!.id,
      currentClassId: scope.currentClassId,
      nextClassId: scope.nextClassId,
      studentIds: selectedStudentIds
    }),
    onSuccess: () => {
      setSelectedStudentIds([]);
      toast({ title: 'Students promoted successfully' });
    },
    onError: (e: any) => toast({ title: 'Promotion failed', description: e.message, variant: 'destructive' })
  });

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>Only administrators can access the student promotion tool.</AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Student Promotions</h1>
          <p className="text-muted-foreground">Promote students to the next academic level</p>
        </div>

        {!activeYear && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Active Academic Year</AlertTitle>
            <AlertDescription>You must set an active academic year in settings before promoting students.</AlertDescription>
          </Alert>
        )}

        {activeYear && !nextYear && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Next Academic Year Missing</AlertTitle>
            <AlertDescription>Please create the next academic year in Admin Settings to enable promotions.</AlertDescription>
          </Alert>
        )}

        {activeYear && nextYear && (
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="md:col-span-1 h-fit">
              <CardHeader>
                <CardTitle>Promotion Scope</CardTitle>
                <CardDescription>Select source and destination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Year</Label>
                  <Input value={activeYear.name} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Class to Promote From</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={scope.currentClassId}
                    onChange={(e) => setScope({ ...scope, currentClassId: e.target.value })}
                  >
                    <option value="">Select class</option>
                    {(classes || []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Section (optional)</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={scope.currentSectionId}
                    onChange={(e) => setScope({ ...scope, currentSectionId: e.target.value })}
                  >
                    <option value="">All Sections</option>
                    {(sections || [])
                      .filter((s: any) => !scope.currentClassId || s.classId === scope.currentClassId)
                      .map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
                <div className="pt-4 border-t space-y-2">
                  <Label className="text-primary flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Target Class
                  </Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-primary bg-background px-3 py-2 text-sm"
                    value={scope.nextClassId}
                    onChange={(e) => setScope({ ...scope, nextClassId: e.target.value })}
                  >
                    <option value="">Promote to...</option>
                    {(classes || []).map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Target Year</Label>
                  <Input value={nextYear.name} disabled className="bg-primary/5 border-primary/20 text-primary font-medium" />
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Students to Promote</CardTitle>
                  <CardDescription>Select individual students or promote all</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedStudentIds((students || []).map((s: any) => s.student.id))}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedStudentIds([])}
                  >
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!scope.currentClassId ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Select a class to view eligible students.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Select</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Current Performance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingStudents ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">Loading students...</TableCell>
                          </TableRow>
                        ) : (students || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No students found in this class/section.</TableCell>
                          </TableRow>
                        ) : (students || []).map((r: any) => (
                          <TableRow key={r.student.id} className={selectedStudentIds.includes(r.student.id) ? 'bg-primary/5' : ''}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedStudentIds.includes(r.student.id)}
                                onCheckedChange={() => toggleStudent(r.student.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{r.student.name}</TableCell>
                            <TableCell className="text-xs font-mono">{r.student.studentId || r.student.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">
                                Enrolled
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm">
                        <span className="font-bold">{selectedStudentIds.length}</span> students selected for promotion.
                      </div>
                      <Button 
                        size="lg"
                        className="gap-2"
                        disabled={selectedStudentIds.length === 0 || !scope.nextClassId || promoteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Are you sure you want to promote ${selectedStudentIds.length} students to ${classes?.find(c => c.id === scope.nextClassId)?.name}?`)) {
                            promoteMutation.mutate();
                          }
                        }}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Execute Promotion
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
