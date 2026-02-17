import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Megaphone } from 'lucide-react';

const AUDIENCE_OPTIONS = [
  { value: 'entire_school', label: 'Entire school' },
  { value: 'parents_only', label: 'Parents only' },
  { value: 'employees_only', label: 'Staff only' },
  { value: 'class', label: 'Specific class' },
  { value: 'sub_role', label: 'Specific role' },
];

export default function CampusAnnouncementsPage() {
  useRequireAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: classes } = useQuery({
    queryKey: ['sms-classes'],
    queryFn: api.sms.classes.list,
  });

  const { data: subRoles } = useQuery({
    queryKey: ['sms-sub-roles'],
    queryFn: api.sms.subRoles.list,
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: api.announcements.list,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', audienceType: 'entire_school', audienceId: '' });
  const [audienceSearch, setAudienceSearch] = useState('');

  const create = useMutation({
    mutationFn: () => api.announcements.create({
      title: form.title,
      message: form.message,
      audienceType: form.audienceType,
      audienceId: form.audienceId || undefined,
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['announcements'] });
      setOpen(false);
      setForm({ title: '', message: '', audienceType: 'entire_school', audienceId: '' });
      toast({ title: 'Announcement sent' });
    },
    onError: (e: any) => {
      toast({ title: 'Failed', description: e?.message || 'Error', variant: 'destructive' });
    },
  });

  const audienceLabel = (type: string) => AUDIENCE_OPTIONS.find((o) => o.value === type)?.label || type;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/brand-icon.svg" alt="Campus" className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Announcements</h1>
              <p className="text-muted-foreground">School-wide announcements and updates</p>
            </div>
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
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Full message" rows={4} />
                </div>
                <div className="grid gap-2">
                  <Label>Audience</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.audienceType}
                    onChange={(e) => {
                      setAudienceSearch('');
                      setForm({ ...form, audienceType: e.target.value, audienceId: '' });
                    }}
                  >
                    {AUDIENCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {form.audienceType === 'class' && (
                  <div className="grid gap-2">
                    <Label>Class</Label>
                    <Input
                      placeholder="Search class..."
                      value={audienceSearch}
                      onChange={(e) => setAudienceSearch(e.target.value)}
                    />
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.audienceId}
                      onChange={(e) => setForm({ ...form, audienceId: e.target.value })}
                    >
                      <option value="">All classes</option>
                      {(classes || [])
                        .filter((c: any) => String(c.name || '').toLowerCase().includes(audienceSearch.trim().toLowerCase()))
                        .map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                )}

                {form.audienceType === 'sub_role' && (
                  <div className="grid gap-2">
                    <Label>Sub-role</Label>
                    <Input
                      placeholder="Search sub-role..."
                      value={audienceSearch}
                      onChange={(e) => setAudienceSearch(e.target.value)}
                    />
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={form.audienceId}
                      onChange={(e) => setForm({ ...form, audienceId: e.target.value })}
                    >
                      <option value="">All sub-roles</option>
                      {(subRoles || [])
                        .filter((r: any) => String(r.name || r.key || '').toLowerCase().includes(audienceSearch.trim().toLowerCase()))
                        .map((r: any) => (
                          <option key={r.id} value={r.key}>{r.name || r.key}</option>
                        ))}
                    </select>
                  </div>
                )}
                <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title.trim() || !form.message.trim()}>
                  {create.isPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Announcements</h2>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !announcements?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No announcements yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(announcements || []).map((a: any) => (
                <Card key={a.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{a.title}</CardTitle>
                      <Badge variant="secondary">{audienceLabel(a.audienceType || 'entire_school')}</Badge>
                    </div>
                    <CardDescription>
                      {a.authorDisplayName || 'School'} · {new Date(a.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
