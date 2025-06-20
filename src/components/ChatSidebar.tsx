
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MessageSquare, FileText, Trash2, LogOut, AlertTriangle, Play, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import UserSettings from './UserSettings';
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
  onPlayLatestResponse: (text: string) => void;
  selectedVoice: 'Rachel' | 'Cassidy';
  onVoiceChange: (voice: 'Rachel' | 'Cassidy') => void;
  isPlaying: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentChatId,
  onChatSelect,
  onNewChat,
  onSignOut,
  userEmail,
  messages,
  onPlayLatestResponse,
  selectedVoice,
  onVoiceChange,
  isPlaying
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetchChats();
    
    // Set up real-time subscription for chat updates
    const channel = supabase
      .channel('chat-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats'
        },
        () => {
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        toast.error('Failed to load chat history');
      } else {
        setChats(data || []);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) {
        toast.error('Failed to delete chat');
        console.error('Error deleting chat:', error);
      } else {
        setChats(chats.filter(chat => chat.id !== chatId));
        toast.success('Chat deleted successfully');
        
        if (currentChatId === chatId) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const deleteAllChats = async () => {
    setIsDeletingAll(true);
    
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        toast.error('Failed to delete chat history');
        console.error('Error deleting all chats:', error);
      } else {
        setChats([]);
        toast.success('All chat history deleted successfully');
        onNewChat();
        setShowDeleteAllDialog(false);
      }
    } catch (error) {
      console.error('Error deleting all chats:', error);
      toast.error('Failed to delete chat history');
    } finally {
      setIsDeletingAll(false);
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

  const handlePlayLatest = () => {
    const latestResponse = getLatestAIResponse();
    if (latestResponse) {
      onPlayLatestResponse(latestResponse.text);
    } else {
      toast.error('No AI response to play');
    }
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
          .sidebar-scrollbar::-webkit-scrollbar-thumb {
            background: #6b7280;
            border-radius: 4px;
          }
          .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #4b5563;
          }
          .dark .sidebar-scrollbar::-webkit-scrollbar-track {
            background: #374151;
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

      {/* Header - Fixed height */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Conversations</h2>
          <div className="flex items-center gap-2">
            <UserSettings
              userEmail={userEmail}
              selectedVoice={selectedVoice}
              onVoiceChange={onVoiceChange}
            />
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={onNewChat}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* User Info */}
        {userEmail && (
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <span className="truncate font-medium">{userEmail}</span>
            <Button
              onClick={onSignOut}
              variant="ghost"
              size="sm"
              className="ml-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Voice Controls */}
        <div className="space-y-3 mb-4">
          <Button
            onClick={handlePlayLatest}
            disabled={isPlaying || !getLatestAIResponse()}
            size="sm"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" />
            <span>{isPlaying ? 'Playing...' : 'Play Latest'}</span>
          </Button>
        </div>

        {/* Delete All Button */}
        {chats.length > 0 && (
          <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </Button>
            </DialogTrigger>
            <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="flex items-center dark:text-white">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  Delete All Chat History
                </DialogTitle>
                <DialogDescription className="dark:text-gray-400">
                  This action cannot be undone. This will permanently delete all your chat history and messages.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteAllDialog(false)}
                  disabled={isDeletingAll}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteAllChats}
                  disabled={isDeletingAll}
                >
                  {isDeletingAll ? 'Deleting...' : 'Delete All'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Chat List with Sidebar Scrollbar */}
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
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentChatId === chat.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-md ${
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
                    className="opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 h-8 w-8 p-0 transition-opacity duration-200"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
