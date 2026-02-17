import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SocialSubNav } from '@/components/SocialSubNav';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Search, TrendingUp, Users, UserPlus, Hash, MessageCircle, Heart, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { mockCommunities, mockUsers } from '@/data-access/mockData';
import { useLocation } from 'wouter';

export default function Explore() {
  const { user } = useRequireAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: postsData } = useQuery({
    queryKey: ['posts'],
    queryFn: () => api.posts.getFeed()
  });
  const posts = postsData?.posts ?? [];
  const trendingPosts = posts?.slice(0, 5) || [];
  const suggestedUsers = mockUsers.filter(u => u.id !== user?.id).slice(0, 6);
  const popularCommunities = mockCommunities.slice(0, 6);

  const trendingTopics = [
    { tag: 'CampusLife', posts: 24 },
    { tag: 'StudyTips', posts: 18 },
    { tag: 'Events2025', posts: 15 },
    { tag: 'Scholarships', posts: 12 },
    { tag: 'CareerAdvice', posts: 10 },
    { tag: 'SportsNews', posts: 8 }
  ];

  const handleFollow = (userName: string) => {
    toast({
      description: `Now following ${userName}`
    });
  };

  const handleJoinCommunity = (communityName: string) => {
    toast({
      description: `Joined ${communityName}`
    });
  };

  return (
    <DashboardLayout>
      <SocialSubNav />
      <div className="max-w-6xl mx-auto space-y-6 mt-6">
        <div className="flex items-center gap-3">
          <img src="/brand-icon.svg" alt="Campus" className="h-10 w-10" />
          <div>
            <h1 className="text-3xl font-bold">Explore</h1>
            <p className="text-muted-foreground">Discover trending content, people, and communities</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts, people, communities, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="trending" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="people" className="gap-2">
              <Users className="w-4 h-4" />
              People
            </TabsTrigger>
            <TabsTrigger value="communities" className="gap-2">
              <Users className="w-4 h-4" />
              Communities
            </TabsTrigger>
            <TabsTrigger value="topics" className="gap-2">
              <Hash className="w-4 h-4" />
              Topics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="mt-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Trending Posts
            </h2>
            {trendingPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/dashboard/social')}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold">{post.authorName}</p>
                          <Badge variant="outline" className="text-xs">
                            {(post as any).category || 'discussion'}
                          </Badge>
                        </div>
                        <p className="text-sm line-clamp-2 mb-3">{post.content}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {post.comments.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="people" className="mt-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Suggested People
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestedUsers.map((suggestedUser, index) => (
                <motion.div
                  key={suggestedUser.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="text-xl">
                            {suggestedUser.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-base">{suggestedUser.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {suggestedUser.role.charAt(0).toUpperCase() + suggestedUser.role.slice(1)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        className="w-full gap-2" 
                        onClick={() => handleFollow(suggestedUser.name)}
                      >
                        <UserPlus className="w-4 h-4" />
                        Follow
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="communities" className="mt-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Popular Communities
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {popularCommunities.map((community, index) => (
                <motion.div
                  key={community.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="text-xl">
                              {community.avatar || community.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{community.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {community.memberCount} members
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {community.description}
                      </p>
                      <Button 
                        className="w-full gap-2" 
                        onClick={() => handleJoinCommunity(community.name)}
                      >
                        <UserPlus className="w-4 h-4" />
                        Join Community
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="topics" className="mt-6 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Trending Topics
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {trendingTopics.map((topic, index) => (
                <motion.div
                  key={topic.tag}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary" onClick={() => setLocation('/dashboard/social')}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hash className="w-5 h-5 text-primary" />
                          <span className="font-semibold">{topic.tag}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {topic.posts} posts
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
