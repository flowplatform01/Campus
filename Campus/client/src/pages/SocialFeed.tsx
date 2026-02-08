import { useState } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SocialSubNav } from '@/components/SocialSubNav';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, MessageCircle, Share2, Send, Search, Filter, 
  TrendingUp, Image, Video, Plus, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type PostCategory = 'all' | 'news' | 'resources' | 'opportunities' | 'discussions' | 'announcements' | 'events' | 'achievements';

export default function SocialFeed() {
  const { user } = useRequireAuth();
  const [, setLocation] = useLocation();
  const [newPost, setNewPost] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [postCategory, setPostCategory] = useState<string>('discussions');
  const [postVisibility, setPostVisibility] = useState<string>('public');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [displayCount, setDisplayCount] = useState(10);
  const [postAsSchool, setPostAsSchool] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canPostAsSchool = user?.role === 'admin' || user?.role === 'employee';

  const { data, refetch } = useQuery({
    queryKey: ['posts', selectedCategory === 'all' ? 'all' : selectedCategory],
    queryFn: () => api.posts.getFeed({ category: selectedCategory === 'all' ? undefined : selectedCategory })
  });
  const posts = data?.posts ?? [];

  const createPostMutation = useMutation({
    mutationFn: (body: { content: string; category?: string; visibility?: string; tags?: string[] }) =>
      api.posts.create({ ...body, category: body.category || postCategory, visibility: postVisibility, tags: selectedTags, postedAsSchool: postAsSchool }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setNewPost('');
      setSelectedTags([]);
      setPostAsSchool(false);
      setIsCreateModalOpen(false);
      toast({
        title: 'Post created!',
        description: 'Your post has been shared with the community'
      });
    }
  });

  const likePostMutation = useMutation({
    mutationFn: (postId: string) => api.posts.like(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    createPostMutation.mutate({
      content: newPost,
      category: postCategory,
      visibility: postVisibility,
      tags: selectedTags
    });
  };

  const handleLike = async (postId: string) => {
    likePostMutation.mutate(postId);
    toast({
      description: 'Post liked!'
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !selectedTags.includes(tagInput.trim())) {
      setSelectedTags([...selectedTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-orange-500 to-red-500';
      case 'employee':
        return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'student':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'parent':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'news':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resources':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'opportunities':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'discussions':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'announcements':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'events':
        return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
      case 'achievements':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const filteredPosts = posts?.filter(post => {
    const matchesCategory = selectedCategory === 'all' || (post as any).category === selectedCategory;
    const tags = (post as any).tags || [];
    const matchesSearch = !searchQuery || 
      (post.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((post as any).authorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const displayedPosts = filteredPosts?.slice(0, displayCount);
  const hasMore = (filteredPosts?.length || 0) > displayCount;

  return (
    <DashboardLayout>
      <SocialSubNav />
      <div className="max-w-4xl mx-auto space-y-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Social Feed</h1>
            <p className="text-muted-foreground">Connect and share with the campus community</p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b">
          <button className="px-4 py-2 border-b-2 border-primary text-primary font-medium">
            For You
          </button>
          <button 
            className="px-4 py-2 border-b-2 border-transparent text-muted-foreground hover:text-foreground"
            onClick={() => setLocation('/social/explore')}
          >
            Explore
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div />
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-create-post-button>
                <Plus className="w-4 h-4" />
                Create Post
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create Post</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {canPostAsSchool && (
                  <button
                    type="button"
                    className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                    onClick={() => setPostAsSchool(!postAsSchool)}
                  >
                    {postAsSchool ? 'Posting as School' : 'Posting as Me'}
                  </button>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={postCategory} onValueChange={setPostCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="news">📰 News</SelectItem>
                      <SelectItem value="resources">📚 Resources</SelectItem>
                      <SelectItem value="opportunities">🎯 Opportunities</SelectItem>
                      <SelectItem value="discussions">💬 Discussions</SelectItem>
                      <SelectItem value="announcements">📢 Announcements</SelectItem>
                      <SelectItem value="events">📅 Events</SelectItem>
                      <SelectItem value="achievements">🏆 Achievements</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    placeholder="Share something with the community..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {newPost.length} characters
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button type="button" size="sm" onClick={handleAddTag}>Add</Button>
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          #{tag}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <Select value={postVisibility} onValueChange={setPostVisibility}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">🌐 Public - Everyone can see</SelectItem>
                      <SelectItem value="school">🏫 School Only - Only your school</SelectItem>
                      <SelectItem value="class">📚 Class Only - Only your class</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePost} disabled={!newPost.trim()}>
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts, users, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
                {selectedCategory !== 'all' && (
                  <Badge variant="secondary" className="ml-1">1</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSelectedCategory('all')}>
                All Posts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('news')}>
                📰 News
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('resources')}>
                📚 Resources
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('opportunities')}>
                🎯 Opportunities
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('discussions')}>
                💬 Discussions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('announcements')}>
                📢 Announcements
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('events')}>
                📅 Events
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedCategory('achievements')}>
                🏆 Achievements
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {selectedCategory !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtered by:</span>
            <Badge variant="secondary" className="gap-2">
              {selectedCategory}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setSelectedCategory('all')}
              />
            </Badge>
          </div>
        )}

        <div className="space-y-4">
          <AnimatePresence>
            {displayedPosts?.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={getRoleColor(post.authorRole)}>
                          {(post.authorDisplayName || post.authorName).charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{post.authorDisplayName || post.authorName}</p>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {post.authorRole}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date((post as any).timestamp || (post as any).createdAt).toLocaleString()}
                            </p>
                          </div>
                          {(post as any).category && (
                            <Badge className={getCategoryColor((post as any).category)}>
                              {(post as any).category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                    
                    {(post as any).media && (
                      <div className="rounded-lg overflow-hidden">
                        <img
                          src={(post as any).media.url}
                          alt="Post media"
                          className="w-full h-auto max-h-96 object-cover"
                        />
                      </div>
                    )}

                    {((post as any).tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {((post as any).tags || []).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className="gap-2"
                      >
                        <Heart className="w-4 h-4" />
                        {(post as any).likes ?? (post as any).likesCount ?? 0}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <MessageCircle className="w-4 h-4" />
                        {post.comments.length}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Share2 className="w-4 h-4" />
                        Share
                      </Button>
                    </div>

                    {((post as any).comments || []).length > 0 && (
                      <div className="space-y-3 pl-4 border-l-2">
                        {((post as any).comments || []).map((comment: any) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {(comment.authorName || '?').charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{comment.authorName || 'User'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(comment.timestamp || comment.createdAt).toLocaleTimeString()}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredPosts?.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <p className="text-muted-foreground">
                  No posts found. Try adjusting your filters or search query.
                </p>
              </div>
            </Card>
          )}

          {hasMore && (
            <div className="flex justify-center py-8">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setDisplayCount(prev => prev + 10)}
                className="gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Load More Posts
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
