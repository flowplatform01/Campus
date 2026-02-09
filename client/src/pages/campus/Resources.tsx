import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

export default function CampusResourcesPage() {
  const { user } = useRequireAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const isStaff = user?.role === 'admin' || user?.role === 'employee';

  const { data: resources, isLoading } = useQuery({
    queryKey: ['sms-resources'],
    queryFn: api.sms.resources.list,
  });

  const { data: subjects } = useQuery({ queryKey: ['sms-subjects'], queryFn: api.sms.subjects.list });
  const subjectNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of subjects || []) m[s.id] = s.name;
    return m;
  }, [subjects]);

  const [form, setForm] = useState({ title: '', description: '', url: '', subjectId: '' });

  const create = useMutation({
    mutationFn: () =>
      api.sms.resources.create({
        title: form.title,
        description: form.description || undefined,
        url: form.url,
        subjectId: form.subjectId || undefined,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-resources'] });
      setForm({ title: '', description: '', url: '', subjectId: '' });
      toast({ title: 'Resource added' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Error', variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.sms.resources.remove(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sms-resources'] });
      toast({ title: 'Deleted' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e?.message || 'Error', variant: 'destructive' }),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="text-muted-foreground">School resource library</p>
        </div>

        {isStaff && (
          <Card>
            <CardHeader>
              <CardTitle>Add Resource</CardTitle>
              <CardDescription>Share links and materials with students</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Description (optional)</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>URL</Label>
                <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Subject (optional)</Label>
                <select
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">(none)</option>
                  {(subjects || []).map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.url}>
                {create.isPending ? 'Saving...' : 'Add'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Library</CardTitle>
            <CardDescription>{isLoading ? 'Loading...' : `${resources?.length || 0} resources`}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(resources || []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>{r.subjectId ? subjectNameById[r.subjectId] || r.subjectId : '—'}</TableCell>
                    <TableCell>
                      <a className="underline" href={r.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </TableCell>
                    <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {isStaff ? (
                        <Button variant="destructive" size="sm" onClick={() => remove.mutate(r.id)} disabled={remove.isPending}>
                          Delete
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(resources || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No resources yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
