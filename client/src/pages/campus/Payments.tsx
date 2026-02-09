import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';

export default function CampusPaymentsPage() {
  const { user } = useRequireAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const { data: feeHeads } = useQuery({ queryKey: ['sms-fee-heads'], queryFn: api.sms.payments.feeHeads.list, enabled: isStaff });
  const { data: invoices, isLoading } = useQuery({ queryKey: ['sms-invoices'], queryFn: api.sms.payments.invoices.list });
  const { data: settings } = useQuery({ queryKey: ['sms-payment-settings'], queryFn: api.sms.payments.settings.get, enabled: user?.role === 'admin' });

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: api.users.list, enabled: isStaff });
  const students = useMemo(() => (users || []).filter((u: any) => u.role === 'student'), [users]);

  const [feeHeadForm, setFeeHeadForm] = useState({ name: '', code: '' });
  const [invoiceForm, setInvoiceForm] = useState({
    studentId: '',
    dueAt: '',
    notes: '',
    feeHeadId: '',
    description: '',
    amount: 0,
  });

  const createFeeHead = useMutation({
    mutationFn: () => api.sms.payments.feeHeads.create({ name: feeHeadForm.name, code: feeHeadForm.code || undefined }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-fee-heads'] });
      setFeeHeadForm({ name: '', code: '' });
      toast({ title: 'Fee head created' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const createInvoice = useMutation({
    mutationFn: () =>
      api.sms.payments.invoices.create({
        studentId: invoiceForm.studentId,
        dueAt: invoiceForm.dueAt ? new Date(invoiceForm.dueAt).toISOString() : undefined,
        notes: invoiceForm.notes || undefined,
        lines: [
          {
            feeHeadId: invoiceForm.feeHeadId || undefined,
            description: invoiceForm.description || 'Fee',
            amount: Number(invoiceForm.amount),
          },
        ],
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-invoices'] });
      setInvoiceForm({ studentId: '', dueAt: '', notes: '', feeHeadId: '', description: '', amount: 0 });
      toast({ title: 'Invoice created' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const [payForm, setPayForm] = useState({ invoiceId: '', amount: 0, method: 'cash', reference: '' });
  const recordPayment = useMutation({
    mutationFn: () => api.sms.payments.payments.create({ invoiceId: payForm.invoiceId, amount: Number(payForm.amount), method: payForm.method, reference: payForm.reference || undefined }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-invoices'] });
      setPayForm({ invoiceId: '', amount: 0, method: 'cash', reference: '' });
      toast({ title: 'Payment recorded' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const { data: expenses } = useQuery({ queryKey: ['expenses'], queryFn: api.expenses.list, enabled: user?.role === 'admin' });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Financials</h1>
            <p className="text-muted-foreground">Invoices, payments, and expenses</p>
          </div>
        </div>

        <Tabs defaultValue="invoices">
          <TabsList>
            <TabsTrigger value="invoices">Invoices & Payments</TabsTrigger>
            {user?.role === 'admin' && <TabsTrigger value="expenses">Expenses</TabsTrigger>}
            {isStaff && <TabsTrigger value="fee-heads">Fee Heads</TabsTrigger>}
          </TabsList>

          <TabsContent value="invoices" className="space-y-6 mt-6">
            {isStaff && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Create Invoice</CardTitle>
                    <CardDescription>Issue an invoice to a student</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Student</Label>
                      <select
                        value={invoiceForm.studentId}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, studentId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select student</option>
                        {students.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.studentId || s.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Due date/time (optional)</Label>
                      <Input type="datetime-local" value={invoiceForm.dueAt} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueAt: e.target.value })} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Fee Head (optional)</Label>
                      <select
                        value={invoiceForm.feeHeadId}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, feeHeadId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">(none)</option>
                        {(feeHeads || []).map((h: any) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Input value={invoiceForm.description} onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Amount</Label>
                      <Input type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Notes (optional)</Label>
                      <Input value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
                    </div>

                    <Button onClick={() => createInvoice.mutate()} disabled={!invoiceForm.studentId || !invoiceForm.amount || createInvoice.isPending}>
                      {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Record Payment</CardTitle>
                    <CardDescription>Record a payment against an invoice</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Invoice</Label>
                      <select
                        value={payForm.invoiceId}
                        onChange={(e) => setPayForm({ ...payForm, invoiceId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select invoice</option>
                        {(invoices || []).map((inv: any) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.id.slice(0, 8)}… — {inv.status} — {inv.totalAmount}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Amount</Label>
                      <Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Method</Label>
                      <Input value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Reference (optional)</Label>
                      <Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
                    </div>
                    <Button onClick={() => recordPayment.mutate()} disabled={!payForm.invoiceId || !payForm.amount || recordPayment.isPending}>
                      {recordPayment.isPending ? 'Saving...' : 'Record Payment'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>{isLoading ? 'Loading...' : `${invoices?.length || 0} invoices`}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Issued</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoices || []).map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.id.slice(0, 8)}…</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell>{inv.totalAmount}</TableCell>
                        <TableCell>{new Date(inv.issuedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {(invoices || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No invoices yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role === 'admin' && (
            <TabsContent value="expenses" className="space-y-6 mt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Record Expense</CardTitle>
                    <CardDescription>Log school expenditures</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Title</Label>
                      <Input placeholder="Electricity Bill" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="utility">Utility</option>
                        <option value="salary">Salary</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Amount</Label>
                      <Input type="number" />
                    </div>
                    <Button>Log Expense</Button>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Expense History</CardTitle>
                    <CardDescription>Recent school expenses</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(expenses || []).map((e: any) => (
                          <TableRow key={e.id}>
                            <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                            <TableCell>{e.title}</TableCell>
                            <TableCell className="capitalize">{e.category}</TableCell>
                            <TableCell className="text-right font-medium">${e.amount}</TableCell>
                          </TableRow>
                        ))}
                        {(expenses || []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No expenses recorded yet</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {isStaff && (
            <TabsContent value="fee-heads" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fee Heads</CardTitle>
                  <CardDescription>Categories for student billing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <Input placeholder="Fee Head Name" value={feeHeadForm.name} onChange={e => setFeeHeadForm({...feeHeadForm, name: e.target.value})} />
                    <Button onClick={() => createFeeHead.mutate()} disabled={!feeHeadForm.name || createFeeHead.isPending}>Add</Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(feeHeads || []).map((h: any) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium">{h.name}</TableCell>
                          <TableCell>{h.code || '—'}</TableCell>
                        </TableRow>
                      ))}
                      {(feeHeads || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">No fee heads yet</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
