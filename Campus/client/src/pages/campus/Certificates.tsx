import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Printer, IdCard, GraduationCap } from 'lucide-react';

export default function CampusCertificatesPage() {
  const { user } = useRequireAuth();
  const { toast } = useToast();
  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const { data: users, isLoading: isLoadingUsers } = useQuery({ 
    queryKey: ['users'], 
    queryFn: api.users.list 
  });
  
  const students = useMemo(() => (users || []).filter((u: any) => u.role === 'student'), [users]);

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">Certificates & ID Cards</h1>
          <p className="text-muted-foreground">Generate and print student documents</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Select Student</CardTitle>
              <CardDescription>Search for a student to generate document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto space-y-2">
                {isLoadingUsers ? (
                  <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : students.map((s: any) => (
                  <Button
                    key={s.id}
                    variant={selectedStudent?.id === s.id ? 'default' : 'ghost'}
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => setSelectedStudent(s)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium truncate">{s.name}</span>
                      <span className="text-[10px] opacity-70">{s.studentId || 'No ID'}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <Tabs defaultValue="id-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <TabsList>
                  <TabsTrigger value="id-card" className="gap-2">
                    <IdCard className="w-4 h-4" />
                    ID Card
                  </TabsTrigger>
                  <TabsTrigger value="completion" className="gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Completion
                  </TabsTrigger>
                </TabsList>
                {selectedStudent && (
                  <Button onClick={handlePrint} size="sm" className="gap-2">
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                )}
              </CardHeader>
              <CardContent className="pt-6">
                {!selectedStudent ? (
                  <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Select a student from the list to preview documents.</p>
                  </div>
                ) : (
                  <>
                    <TabsContent value="id-card">
                      <div className="flex justify-center p-8 bg-muted/30 rounded-xl">
                        <div id="id-card-preview" className="w-[350px] h-[220px] bg-white rounded-xl shadow-lg border-t-[12px] border-primary flex flex-col p-4 relative overflow-hidden">
                          <div className="flex gap-4">
                            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border">
                              {selectedStudent.avatarUrl ? (
                                <img src={selectedStudent.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <IdCard className="w-10 h-10 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <h3 className="font-bold text-lg leading-tight">{selectedStudent.name}</h3>
                              <p className="text-xs font-semibold text-primary">STUDENT</p>
                              <div className="pt-2 text-[10px] space-y-0.5">
                                <p><span className="text-muted-foreground">ID:</span> {selectedStudent.studentId || 'STU-001'}</p>
                                <p><span className="text-muted-foreground">Grade:</span> {selectedStudent.grade || '10'}</p>
                                <p><span className="text-muted-foreground">Section:</span> {selectedStudent.classSection || 'A'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-auto flex justify-between items-end border-t pt-2">
                            <div>
                              <p className="text-[10px] font-bold text-primary">CAMPUS PLATFORM</p>
                              <p className="text-[8px] text-muted-foreground">2025/2026 ACADEMIC YEAR</p>
                            </div>
                            <div className="w-16 h-16 bg-white border p-1 rounded">
                              {/* Placeholder for QR code */}
                              <div className="w-full h-full bg-gray-100 grid grid-cols-4 grid-rows-4 gap-[1px]">
                                {[...Array(16)].map((_, i) => (
                                  <div key={i} className={`bg-${Math.random() > 0.5 ? 'black' : 'transparent'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          {/* Design elements */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8" />
                          <div className="absolute bottom-0 left-0 w-16 h-16 bg-purple-500/5 rounded-full -ml-4 -mb-4" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="completion">
                      <div className="flex justify-center p-8 bg-muted/30 rounded-xl overflow-x-auto">
                        <div className="w-[800px] h-[560px] bg-white border-[20px] border-double border-primary/20 p-12 flex flex-col items-center text-center shadow-lg relative">
                          <GraduationCap className="w-16 h-16 text-primary mb-6" />
                          <h1 className="text-4xl font-serif font-bold text-gray-800 mb-2 italic">Certificate of Achievement</h1>
                          <p className="text-lg text-muted-foreground uppercase tracking-widest mb-8">This is to certify that</p>
                          
                          <h2 className="text-5xl font-serif font-bold text-primary mb-8 border-b-2 border-gray-200 px-12 pb-2">
                            {selectedStudent.name}
                          </h2>
                          
                          <p className="text-lg text-gray-600 max-w-xl leading-relaxed mb-12">
                            Has successfully completed the academic requirements for 
                            <span className="font-bold"> {selectedStudent.grade || 'Grade 10'} </span>
                            during the 2025/2026 academic session with exemplary performance and conduct.
                          </p>
                          
                          <div className="mt-auto w-full flex justify-around items-end pt-8">
                            <div className="flex flex-col items-center">
                              <div className="w-48 border-b border-gray-400 mb-2" />
                              <p className="text-sm font-semibold">School Principal</p>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-48 border-b border-gray-400 mb-2" />
                              <p className="text-sm font-semibold">Academic Dean</p>
                            </div>
                          </div>
                          
                          <div className="absolute bottom-6 left-6 text-[10px] text-muted-foreground uppercase tracking-tighter">
                            Verification ID: {selectedStudent.id.slice(0, 16)}
                          </div>
                          
                          {/* Ornamental corners */}
                          <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-primary/40" />
                          <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary/40" />
                          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-primary/40" />
                          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-primary/40" />
                        </div>
                      </div>
                    </TabsContent>
                  </>
                )}
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Print-only View */}
      <div className="hidden print:block bg-white p-0 m-0">
        {selectedStudent && (
          <div className="flex items-center justify-center min-h-screen">
             {/* Content is duplicated here for printing or use specific print styles on the above components */}
             <div className="scale-125">
                {/* For production, you'd use a more robust print CSS strategy or dedicated print component */}
                <div className="border p-8 rounded">
                  <p>Document for {selectedStudent.name} is ready for printing.</p>
                  <p className="text-xs text-muted-foreground mt-2">Campus Platform Document Generation</p>
                </div>
             </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            background-color: white !important;
          }
          .DashboardLayout {
            padding: 0 !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
