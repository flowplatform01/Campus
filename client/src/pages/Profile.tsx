import { DashboardLayout } from '@/components/DashboardLayout';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function Profile() {
  const { user } = useRequireAuth();
  const { updateUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.avatar || null);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/upload/profile-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('campus_access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: 'Profile photo updated successfully'
      });

      // Update preview with final URL
      if (result.url) {
        setPreviewUrl(result.url);
        try {
          await updateUser({ avatar: result.url });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to persist profile photo';
          toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
        }
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to update profile photo',
        variant: 'destructive'
      });
      // Reset preview on error
      setPreviewUrl(user?.avatar || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <img src="/brand-icon.svg" alt="Campus" className="h-10 w-10" />
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your personal information</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={previewUrl || undefined} />
                <AvatarFallback className="text-3xl">{user?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  onClick={handleFileSelect}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Change Avatar'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG or GIF. Max 5MB.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" defaultValue={user?.role} disabled />
              </div>
            </div>

            <Button
              onClick={async () => {
                try {
                  await updateUser({ name, phone });
                  toast({ title: 'Profile Updated', description: 'Your profile has been saved successfully' });
                } catch (e) {
                  const msg = e instanceof Error ? e.message : 'Failed to save profile';
                  toast({ title: 'Profile update failed', description: msg, variant: 'destructive' });
                }
              }}
            >
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
