import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SocialSubNav } from '@/components/SocialSubNav';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Search, MessageCircle, Users, Plus, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { mockChats } from '@/data-access/mockData';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Chats() {
  const { user } = useRequireAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const selectedConversation = mockChats.find(chat => chat.id === selectedChat);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    toast({
      description: 'Message sent!'
    });
    setMessage('');
  };

  const filteredChats = mockChats.filter(chat =>
    chat.participantNames.some(name => 
      name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ||
    (chat.name && chat.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const privateChats = filteredChats.filter(chat => chat.type === 'private');
  const groupChats = filteredChats.filter(chat => chat.type === 'group');
  const communityChats = filteredChats.filter(chat => chat.type === 'group' && chat.participants && chat.participants.length >= 5);
  const [activeTab, setActiveTab] = useState<'all' | 'private' | 'groups' | 'community'>('all');

  const tabChats = activeTab === 'all' ? filteredChats : 
                   activeTab === 'private' ? privateChats : 
                   activeTab === 'groups' ? groupChats : 
                   communityChats;

  return (
    <DashboardLayout>
      <SocialSubNav />
      <div className="h-[calc(100vh-12rem)] max-w-7xl mx-auto mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Chats</h1>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                New
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-4 border-b">
              <button 
                className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'all' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('all')}
              >
                My Chats
              </button>
              <button 
                className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'groups' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('groups')}
              >
                Groups
              </button>
              <button 
                className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'community' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('community')}
              >
                Community
              </button>
            </div>

            <div className="mt-4">
                <ScrollArea className="h-[calc(100vh-24rem)]">
                  <div className="space-y-2">
                    {tabChats.map((chat) => (
                      <motion.div
                        key={chat.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => setSelectedChat(chat.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedChat === chat.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-accent'
                        } border`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {chat.avatar || (chat.name ? chat.name.charAt(0) : chat.participantNames[0].charAt(0))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">
                                {chat.name || chat.participantNames.join(', ')}
                              </p>
                              {chat.unreadCount > 0 && (
                                <Badge variant="default" className="ml-2">
                                  {chat.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {chat.lastMessage}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(chat.lastMessageTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {selectedConversation.avatar || 
                         (selectedConversation.name 
                           ? selectedConversation.name.charAt(0) 
                           : selectedConversation.participantNames[0].charAt(0))}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {selectedConversation.name || selectedConversation.participantNames.join(', ')}
                      </p>
                      {selectedConversation.type === 'group' && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {selectedConversation.participants.length} members
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {selectedConversation.participantNames[0].charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-accent p-3 rounded-lg max-w-md">
                          <p className="text-sm">{selectedConversation.lastMessage}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(selectedConversation.lastMessageTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>

                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button size="icon" onClick={handleSendMessage}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <div className="text-center p-12">
                  <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Select a chat to start messaging
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
