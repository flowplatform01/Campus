import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Bell, Lock, Globe, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SETTINGS_STORAGE_KEY = 'campus_user_settings';

function getStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    emailNotif: true,
    pushNotif: true,
    socialNotif: true,
    campusNotif: true,
    profileVisible: true,
    showActivity: true,
    contactVisible: false,
    language: 'en',
    timezone: 'utc',
  };
}

function storeSettings(s: Record<string, unknown>) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Deleting soon...';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Settings() {
  const { user } = useRequireAuth();
  const { updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user?.id, user?.name, user?.email, user?.phone]);
  const [settings, setSettings] = useState(getStoredSettings);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { data: deletionStatus, refetch: refetchDeletion } = useQuery({
    queryKey: ['account-deletion-status'],
    queryFn: api.auth.account.deletionStatus,
  });

  const requestDeletion = useMutation({
    mutationFn: api.auth.account.requestDeletion,
    onSuccess: async () => {
      await refetchDeletion();
      setDeleteDialogOpen(false);
      setDeleteConfirm('');
      toast({ title: 'Deletion scheduled', description: 'Your account will be deleted in 7 days. You can cancel anytime.', variant: 'destructive' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });

  const cancelDeletion = useMutation({
    mutationFn: api.auth.account.cancelDeletion,
    onSuccess: async () => {
      await refetchDeletion();
      toast({ title: 'Deletion cancelled', description: 'Your account will not be deleted.' });
    },
    onError: (e: Error) => toast({ title: 'Failed to cancel', description: e.message, variant: 'destructive' }),
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: ''
      });
    }
  }, [user]);

  useEffect(() => {
    storeSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (deletionStatus?.pending && deletionStatus?.scheduledAt) {
      const tick = async () => {
        const remaining = new Date(deletionStatus.scheduledAt).getTime() - Date.now();
        setTimeLeft(remaining);
        if (remaining <= 0) {
          try {
            await api.auth.me();
          } catch {
            // Account deleted or session invalid
          }
          logout();
          window.location.href = '/';
        }
      };
      tick();
      const t = setInterval(tick, 60000);
      return () => clearInterval(t);
    }
    setTimeLeft(null);
  }, [deletionStatus, logout]);

  const handleSaveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    try {
      await updateUser({
        name: profileData.name,
        phone: profileData.phone,
      });
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully'
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save profile';
      toast({
        title: 'Profile update failed',
        description: msg,
        variant: 'destructive'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (changingPassword) return;
    if (!currentPassword || !newPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in your current and new password',
        variant: 'destructive'
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 6 characters',
        variant: 'destructive'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'New password and confirmation must match',
        variant: 'destructive'
      });
      return;
    }

    setChangingPassword(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully'
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to change password';
      toast({
        title: 'Password change failed',
        description: msg,
        variant: 'destructive'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.toUpperCase() !== 'DELETE') {
      toast({ title: 'Type DELETE to confirm', variant: 'destructive' });
      return;
    }
    requestDeletion.mutate();
  };

  const pendingDeletion = deletionStatus && 'pending' in deletionStatus && deletionStatus.pending;
  const scheduledAt = pendingDeletion && 'scheduledAt' in deletionStatus ? deletionStatus.scheduledAt : null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {pendingDeletion && scheduledAt && (
          <Card className="border-destructive bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Account deletion scheduled
              </CardTitle>
              <CardDescription>
                Your account will be permanently deleted on {new Date(scheduledAt).toLocaleString()}.
                You can cancel before then.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-medium">
                <Clock className="w-5 h-5" />
                Time remaining: {timeLeft !== null ? formatTimeLeft(timeLeft) : '...'}
              </div>
              <Button
                variant="outline"
                onClick={() => cancelDeletion.mutate()}
                disabled={cancelDeletion.isPending}
              >
                {cancelDeletion.isPending ? 'Cancelling...' : 'Cancel deletion'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Lock className="w-4 h-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Globe className="w-4 h-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="opacity-70"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here. Contact support if needed.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+237 6XX XXX XXX"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  />
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Profile'}</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password regularly for security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword}>{changingPassword ? 'Updating...' : 'Update Password'}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive updates (saved to this device)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'emailNotif', label: 'Email Notifications', desc: 'Receive updates via email' },
                  { key: 'pushNotif', label: 'Push Notifications', desc: 'Receive push notifications' },
                  { key: 'socialNotif', label: 'Social Notifications', desc: 'Get notified about social activity' },
                  { key: 'campusNotif', label: 'Campus Notifications', desc: 'Receive academic and administrative updates' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={!!settings[key]}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, [key]: v }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control who can see your information (saved to this device)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'profileVisible', label: 'Public Profile', desc: 'Make your profile visible to others' },
                  { key: 'showActivity', label: 'Show Activity Status', desc: "Let others see when you're online" },
                  { key: 'contactVisible', label: 'Contact Information Visible', desc: 'Display your email and phone number' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <Label>{label}</Label>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={!!settings[key]}
                      onCheckedChange={(v) => setSettings((s) => ({ ...s, [key]: v }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dark-mode">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Toggle dark mode theme</p>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Language & Region</CardTitle>
                <CardDescription>Set your preferred language and region (saved to this device)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={settings.language} onValueChange={(v) => setSettings((s) => ({ ...s, language: v }))}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(v) => setSettings((s) => ({ ...s, timezone: v }))}>
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                      <SelectItem value="gmt">GMT</SelectItem>
                      <SelectItem value="wca">West/Central Africa (WAT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions. Account will be deleted 7 days after confirmation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-destructive">Delete Account</Label>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data. You have 7 days to cancel.</p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={!!pendingDeletion}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {pendingDeletion ? 'Deletion scheduled' : 'Delete account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data after 7 days.
              You can cancel the deletion within those 7 days from Settings.
              <br /><br />
              Type <strong>DELETE</strong> below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Type DELETE to confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteConfirm.toUpperCase() !== 'DELETE' || requestDeletion.isPending}
            >
              {requestDeletion.isPending ? 'Scheduling...' : 'Confirm deletion'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
