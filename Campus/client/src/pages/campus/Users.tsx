import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { MoreHorizontal, IdCard, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function CampusUsersPage() {
  useRequireAuth(['admin']);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ['campus-users'],
    queryFn: api.users.list,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'Campus@12345',
    role: 'student',
    subRole: '',
    studentId: '',
    employeeId: '',
  });

  const createUser = useMutation({
    mutationFn: () =>
      api.users.create({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role as any,
        subRole: form.role === 'employee' ? form.subRole : undefined,
        studentId: form.role === 'student' ? form.studentId : undefined,
        employeeId: form.role === 'employee' ? form.employeeId : undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['campus-users'] });
      setOpen(false);
      toast({ title: 'User created', description: 'The user can now log in.' });
    },
    onError: (e: any) => {
      toast({ title: 'Failed to create user', description: e?.message || 'Error', variant: 'destructive' });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">Create and manage students, parents, and employees in your school</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Create User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new user</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input id="password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value, subRole: '', studentId: '', employeeId: '' })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="student">Student</option>
                    <option value="parent">Parent</option>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {form.role === 'student' && (
                  <div className="grid gap-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input id="studentId" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
                  </div>
                )}

                {form.role === 'employee' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="subRole">Position</Label>
                      <Input id="subRole" value={form.subRole} onChange={(e) => setForm({ ...form, subRole: e.target.value })} placeholder="teacher" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input id="employeeId" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
                    </div>
                  </>
                )}

                <Button onClick={() => createUser.mutate()} disabled={createUser.isPending}>
                  {createUser.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>School Users</CardTitle>
            <CardDescription>{isLoading ? 'Loading users...' : `${users?.length || 0} users`}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sub-role</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(users || []).map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.role}</TableCell>
                    <TableCell>{u.subRole || '-'}</TableCell>
                    <TableCell>{u.studentId || '-'}</TableCell>
                    <TableCell>{u.employeeId || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast({ title: "ID Card Generation", description: `Generating ID Card for ${u.name}` })}>
                            <IdCard className="mr-2 h-4 w-4" />
                            ID Card
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast({ title: "Certificate Generation", description: `Generating Certificate for ${u.name}` })}>
                            <FileText className="mr-2 h-4 w-4" />
                            Certificate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
