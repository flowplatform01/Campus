import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function CampusAnnouncementsPage() {
  useRequireAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: api.announcements.list,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '' });

  const create = useMutation({
    mutationFn: () => api.announcements.create(form.title, form.message),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['announcements'] });
      setOpen(false);
      setForm({ title: '', message: '' });
      toast({ title: 'Announcement sent' });
    },
    onError: (e: any) => {
      toast({ title: 'Failed', description: e?.message || 'Error', variant: 'destructive' });
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Announcements</h1>
            <p className="text-muted-foreground">School-wide announcements and updates</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New Announcement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create announcement</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Input id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  {create.isPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Announcements</CardTitle>
            <CardDescription>{isLoading ? 'Loading...' : `${announcements?.length || 0} announcements`}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Author</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(announcements || []).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.authorDisplayName || 'School'}</TableCell>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell>{a.message}</TableCell>
                    <TableCell>{new Date(a.createdAt).toLocaleString()}</TableCell>
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
