import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SocialSubNav } from '@/components/SocialSubNav';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Plus, Lock, Globe, School, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockCommunities } from '@/data-access/mockData';

export default function Communities() {
  const { user } = useRequireAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    type: 'club' as const
  });
  const { toast } = useToast();

  const handleCreateCommunity = () => {
    if (!newCommunity.name.trim()) {
      toast({
        title: 'Error',
        description: 'Community name is required',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Community Created!',
      description: `${newCommunity.name} has been created successfully`
    });

    setIsCreateModalOpen(false);
    setNewCommunity({ name: '', description: '', type: 'club' });
  };

  const handleJoinCommunity = (communityName: string) => {
    toast({
      title: 'Joined Community!',
      description: `You are now a member of ${communityName}`
    });
  };

  const filteredCommunities = mockCommunities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'school':
        return <School className="w-4 h-4" />;
      case 'class':
        return <Users className="w-4 h-4" />;
      case 'club':
        return <Users className="w-4 h-4" />;
      case 'department':
        return <Lock className="w-4 h-4" />;
      case 'public':
        return <Globe className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'school':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'class':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'club':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'department':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'public':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <SocialSubNav />
      <div className="max-w-6xl mx-auto space-y-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Communities</h1>
            <p className="text-muted-foreground">Join communities and collaborate with others</p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Community
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Community</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Community Name</label>
                  <Input
                    placeholder="e.g., Photography Club"
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="What is this community about?"
                    value={newCommunity.description}
                    onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={newCommunity.type}
                    onValueChange={(value: any) => setNewCommunity({ ...newCommunity, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="club">Club</SelectItem>
                      <SelectItem value="class">Class</SelectItem>
                      <SelectItem value="department">Department</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCommunity}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCommunities.map((community, index) => (
            <motion.div
              key={community.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-2xl">
                          {community.avatar || community.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{community.name}</CardTitle>
                        <Badge className={`${getTypeColor(community.type)} gap-1 mt-1`}>
                          {getTypeIcon(community.type)}
                          {community.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="line-clamp-2">
                    {community.description}
                  </CardDescription>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{community.memberCount} members</span>
                  </div>

                  <Button
                    className="w-full gap-2"
                    variant={community.members.includes(user!.id) ? "outline" : "default"}
                    onClick={() => handleJoinCommunity(community.name)}
                  >
                    {community.members.includes(user!.id) ? (
                      <>
                        <Users className="w-4 h-4" />
                        View Community
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Join Community
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredCommunities.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No communities found. Try adjusting your search or create a new one!
              </p>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
