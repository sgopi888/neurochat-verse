import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MessageSquare, FileText, Trash2, LogOut, AlertTriangle, Play, Pause, User } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import UserSettings from './UserSettings';
import BackgroundMusicUpload from './BackgroundMusicUpload';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Chat {
  id: string;
  title: string;
  is_article: boolean;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatSidebarProps {
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onSignOut: () => void;
  userEmail?: string;
  messages: Message[];
  onPlayLatestResponse: () => void;
  onPauseAudio: () => void;
  selectedVoice: 'James' | 'Cassidy' | 'Drew' | 'Lavender';
  onVoiceChange: (voice: 'James' | 'Cassidy' | 'Drew' | 'Lavender') => void;
  isPlaying: boolean;
  musicName?: string;
  onMusicUpload: (file: File) => void;
  onRemoveMusic: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentChatId,
  onChatSelect,
  onNewChat,
  onSignOut,
  userEmail,
  messages,
  onPlayLatestResponse,
  onPauseAudio,
  selectedVoice,
  onVoiceChange,
  isPlaying,
  musicName,
  onMusicUpload,
  onRemoveMusic
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      console.log('Fetching chats for user:', user.id);
      fetchChats();
      fetchUserProfile();
      
      const channel = supabase
        .channel('chat-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_sessions'
          },
          (payload) => {
            console.log('Real-time chat update:', payload);
            fetchChats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
      } else if (data) {
        setAvatarUrl(data.avatar_url);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const fetchChats = async () => {
    if (!user) {
      console.log('No user found, clearing chats');
      setChats([]);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Fetching chat sessions for user:', user.id);
      
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chat sessions:', error);
        toast.error('Failed to load chat history');
      } else {
        console.log('Fetched chat sessions:', data);
        setChats(data || []);
      }
    } catch (error) {
      console.error('Error in fetchChats:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      console.log('Deleting chat:', chatId);
      
      const { error } = await supabase
        .from('chat_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', chatId);

      if (error) {
        console.error('Error deleting chat:', error);
        toast.error('Failed to delete chat');
      } else {
        console.log('Chat deleted successfully');
        setChats(chats.filter(chat => chat.id !== chatId));
        toast.success('Chat deleted successfully');
        
        if (currentChatId === chatId) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error('Error in deleteChat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateTitle = (title: string, maxLength: number = 30) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  const getLatestAIResponse = () => {
    const aiMessages = messages.filter(msg => !msg.isUser);
    return aiMessages.length > 0 ? aiMessages[aiMessages.length - 1] : null;
  };

  const getInitials = () => {
    if (!userEmail) return 'U';
    const name = userEmail.split('@')[0];
    return name.charAt(0).toUpperCase();
  };

  const handleAvatarUpdate = (newAvatarUrl: string | null) => {
    setAvatarUrl(newAvatarUrl);
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen transition-colors duration-200 overflow-hidden">
      <style>
        {`
          .sidebar-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .sidebar-scrollbar::-webkit-scrollbar-track {
            background: #e5e7eb;
          }
          .dark .sidebar-scrollbar::-webkit-scrollbar-track {
            background: #374151;
          }
          .sidebar-scrollbar::-webkit-scrollbar-thumb {
            background: #6b7280;
            border-radius: 4px;
          }
          .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #4b5563;
          }
          .dark .sidebar-scrollbar::-webkit-scrollbar-thumb {
            background: #9ca3af;
          }
          .dark .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #d1d5db;
          }
          .sidebar-scrollbar {
            scrollbar-width: thin;
          }
        `}
      </style>

      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat History</h2>
          <div className="flex items-center gap-2">
            <BackgroundMusicUpload
              onMusicUpload={onMusicUpload}
              currentMusicName={musicName}
              onRemoveMusic={onRemoveMusic}
            />
            <Button
              onClick={onNewChat}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="font-medium">New Chat</span>
            </Button>
          </div>
        </div>
        
        {/* Voice Controls */}
        <div className="space-y-3">
          <Button
            onClick={isPlaying ? onPauseAudio : onPlayLatestResponse}
            disabled={!getLatestAIResponse()}
            size="sm"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 transition-all duration-200 hover:scale-105"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPlaying ? 'Pause' : 'Play Script'}</span>
          </Button>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full overflow-y-auto sidebar-scrollbar p-2 space-y-1">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs">Start a conversation to see it here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                    currentChatId === chat.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 shadow-md'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-md transition-colors duration-200 ${
                      chat.is_article 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-blue-100 dark:bg-blue-900/20'
                    }`}>
                      {chat.is_article ? (
                        <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {truncateTitle(chat.title)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(chat.updated_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={(e) => deleteChat(chat.id, e)}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8 border border-gray-200 dark:border-gray-700">
              <AvatarImage src={avatarUrl || undefined} alt="Profile picture" />
              <AvatarFallback className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {userEmail ? userEmail.split('@')[0] : 'User'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <UserSettings
              userEmail={userEmail}
              selectedVoice={selectedVoice}
              onVoiceChange={onVoiceChange}
              onThemeToggle={toggleTheme}
              currentTheme={theme}
              avatarUrl={avatarUrl}
              onAvatarUpdate={handleAvatarUpdate}
              chats={chats}
              currentChatId={currentChatId}
              onNewChat={onNewChat}
              onChatRefresh={fetchChats}
            />
            <Button
              onClick={onSignOut}
              variant="ghost"
              size="sm"
              className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
