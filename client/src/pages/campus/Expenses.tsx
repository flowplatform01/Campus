import { useMutation, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Receipt, TrendingDown } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';

export default function CampusExpensesPage() {
  const { user } = useRequireAuth();
  const { toast } = useToast();
  const isBursarOrAdmin = user?.role === 'admin' || (user as any)?.subRole === 'bursar' || (user as any)?.subRole === 'accountant';

  const { data: expenses, isLoading } = useQuery({ 
    queryKey: ['sms-expenses'], 
    queryFn: api.sms.expenses.list 
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'other',
    title: '',
    amount: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const createExpense = useMutation({
    mutationFn: () => api.sms.expenses.create({
      ...newExpense,
      amount: parseInt(String(newExpense.amount), 10),
      date: (newExpense.date ? new Date(newExpense.date) : new Date()).toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-expenses'] });
      setIsCreateDialogOpen(false);
      setNewExpense({ category: 'other', title: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] });
      toast({ title: 'Expense recorded successfully' });
    },
    onError: (e: any) => toast({ title: 'Failed to record expense', description: e.message, variant: 'destructive' })
  });

  const totalExpenses = (expenses || []).reduce((acc: number, curr: any) => acc + curr.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Expenses</h1>
            <p className="text-muted-foreground">Track and manage school expenditures</p>
          </div>
          {isBursarOrAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Record Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record New Expense</DialogTitle>
                  <DialogDescription>Enter the details of the expenditure</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Title / Purpose</Label>
                    <Input 
                      placeholder="e.g. Monthly Electricity Bill" 
                      value={newExpense.title} 
                      onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      >
                        <option value="salary">Salary</option>
                        <option value="utility">Utility</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="stationery">Stationery</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount</Label>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date" 
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input 
                      placeholder="Additional details..." 
                      value={newExpense.notes}
                      onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => createExpense.mutate()} 
                    disabled={!newExpense.title || !newExpense.amount || createExpense.isPending}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Cumulative school expenditure</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Receipt className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(expenses || [])
                  .filter((e: any) => new Date(e.date).getMonth() === new Date().getMonth())
                  .reduce((acc: number, curr: any) => acc + curr.amount, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Expenses for current month</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Records</CardTitle>
            <CardDescription>History of all school expenditures</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading expenses...</TableCell>
                  </TableRow>
                ) : (expenses || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No expenses recorded</TableCell>
                  </TableRow>
                ) : (expenses || []).map((expense: any) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{expense.title}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-[10px] font-semibold uppercase bg-gray-100 text-gray-700">
                        {expense.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{expense.recordedBy?.name || '—'}</TableCell>
                    <TableCell className="text-right font-bold">${expense.amount.toLocaleString()}</TableCell>
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
