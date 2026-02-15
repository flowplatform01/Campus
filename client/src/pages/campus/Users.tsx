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

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function CampusUsersPage() {
  useRequireAuth(['admin']);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ['campus-users'],
    queryFn: api.users.list,
  });

  const { data: schoolProfile } = useQuery({
    queryKey: ['sms-school'],
    queryFn: api.sms.school.get,
  });

  const { data: subRoles } = useQuery({
    queryKey: ['sms-sub-roles'],
    queryFn: () => api.sms.subRoles.list(),
  });

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'Campus@12345',
    role: 'student',
    subRole: '',
    studentId: '',
    employeeId: '',
  });

  const filteredUsers = (users || []).filter((u: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = String(u?.name || '').toLowerCase();
    const email = String(u?.email || '').toLowerCase();
    const role = String(u?.role || '').toLowerCase();
    const studentId = String(u?.studentId || '').toLowerCase();
    const employeeId = String(u?.employeeId || '').toLowerCase();
    const subRole = String(u?.subRole || '').toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      role.includes(q) ||
      studentId.includes(q) ||
      employeeId.includes(q) ||
      subRole.includes(q)
    );
  });

  const generateIdCard = (u: any) => {
    const schoolName = String(schoolProfile?.name || 'School');
    const logoUrl = String(schoolProfile?.logoUrl || '');
    const fullName = String(u?.name || '');
    const role = String(u?.role || '').toUpperCase();
    const code = String(u?.studentId || u?.employeeId || u?.email || u?.id || '');

    const w = window.open('', '_blank');
    if (!w) {
      toast({ title: 'Popup blocked', description: 'Allow popups to generate ID card', variant: 'destructive' });
      return;
    }

    const safe = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);

    w.document.open();
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ID Card</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; background: #f6f7fb; }
    .card { width: 360px; background: white; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,.08); }
    .top { padding: 16px; background: #111827; color: white; display: flex; gap: 12px; align-items: center; }
    .logo { width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,.12); display:flex; align-items:center; justify-content:center; overflow:hidden; }
    .logo img { width: 100%; height: 100%; object-fit: cover; }
    .school { font-size: 14px; font-weight: 700; line-height: 1.2; }
    .role { font-size: 12px; opacity: .85; margin-top: 4px; }
    .mid { padding: 16px; display: grid; gap: 10px; }
    .name { font-size: 18px; font-weight: 800; }
    .code { font-size: 12px; color: #6b7280; word-break: break-all; }
    .row { display:flex; justify-content: space-between; font-size: 12px; color:#374151; }
    .footer { padding: 14px 16px; background: #f3f4f6; display:flex; justify-content: space-between; align-items:center; }
    .btn { padding: 8px 10px; border-radius: 10px; border: 1px solid #e5e7eb; background: white; cursor: pointer; font-size: 12px; }
    @media print { body { background: white; padding: 0; } .footer { display:none; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="top">
      <div class="logo">${logoUrl ? `<img src="${safe(logoUrl)}" />` : `<span style="font-weight:800">${safe(schoolName.charAt(0))}</span>`}</div>
      <div>
        <div class="school">${safe(schoolName)}</div>
        <div class="role">${safe(role)}</div>
      </div>
    </div>
    <div class="mid">
      <div class="name">${safe(fullName)}</div>
      <div class="code">${safe(code)}</div>
      <div class="row"><span>Generated</span><span>${new Date().toLocaleDateString()}</span></div>
    </div>
    <div class="footer">
      <button class="btn" onclick="window.print()">Print</button>
      <button class="btn" onclick="window.close()">Close</button>
    </div>
  </div>
</body>
</html>`);
    w.document.close();
  };

  const generateCertificate = (u: any) => {
    const schoolName = String(schoolProfile?.name || 'School');
    const logoUrl = String(schoolProfile?.logoUrl || '');
    const fullName = String(u?.name || '');
    const role = String(u?.role || '').toUpperCase();
    const code = String(u?.studentId || u?.employeeId || u?.email || u?.id || '');
    const issueDate = new Date().toLocaleDateString();

    const w = window.open('', '_blank');
    if (!w) {
      toast({ title: 'Popup blocked', description: 'Allow popups to generate certificate', variant: 'destructive' });
      return;
    }

    const safe = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);

    w.document.open();
    w.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Certificate</title>
  <style>
    body { font-family: Georgia, serif; padding: 32px; background: #fafafa; }
    .cert { width: 600px; max-width: 100%; margin: 0 auto; background: white; border: 12px solid #fbbf24; border-radius: 8px; padding: 48px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
    .logo { width: 80px; height: 80px; margin: 0 auto 24px; border-radius: 50%; overflow: hidden; background: #f3f4f6; display: flex; align-items: center; justify-content: center; }
    .logo img { width: 100%; height: 100%; object-fit: cover; }
    .school { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
    .title { font-size: 42px; font-weight: 700; color: #111827; margin: 32px 0 24px; text-transform: uppercase; letter-spacing: 2px; }
    .subtitle { font-size: 20px; color: #6b7280; margin-bottom: 40px; }
    .name { font-size: 36px; font-weight: 700; color: #111827; margin: 24px 0; text-decoration: underline; text-underline-offset: 6px; }
    .role { font-size: 18px; color: #374151; margin-bottom: 16px; }
    .code { font-size: 16px; color: #6b7280; margin-bottom: 32px; }
    .date { font-size: 16px; color: #6b7280; margin-top: 48px; }
    .border { border: 2px solid #e5e7eb; margin: 32px 0; }
    @media print { body { background: white; padding: 0; } .cert { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="cert">
    <div class="logo">${logoUrl ? `<img src="${safe(logoUrl)}" />` : `<span style="font-size:32px;font-weight:700;color:#9ca3af">${safe(schoolName.charAt(0))}</span>`}</div>
    <div class="school">${safe(schoolName)}</div>
    <div class="title">Certificate</div>
    <div class="subtitle">This is to certify that</div>
    <div class="name">${safe(fullName)}</div>
    <div class="role">${safe(role)}</div>
    <div class="code">ID: ${safe(code)}</div>
    <div class="border"></div>
    <div class="date">Issued on ${safe(issueDate)}</div>
  </div>
</body>
</html>`);
    w.document.close();
  };

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
                      <Label htmlFor="subRole">Sub-role</Label>
                      <select
                        id="subRole"
                        value={form.subRole}
                        onChange={(e) => setForm({ ...form, subRole: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select Sub-role</option>
                        {(subRoles || []).map((sr: { id: string; key: string; name: string }) => (
                          <option key={sr.id} value={sr.key}>{sr.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="employeeId">Employee ID (optional)</Label>
                      <Input id="employeeId" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="e.g. EMP001" />
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
            <div className="mb-4">
              <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
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
                {(filteredUsers || []).map((u: any) => (
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
                          <DropdownMenuItem onClick={() => generateIdCard(u)}>
                            <IdCard className="mr-2 h-4 w-4" />
                            ID Card
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => generateCertificate(u)}>
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
