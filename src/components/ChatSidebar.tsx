
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MessageSquare, FileText, Trash2, LogOut, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
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

interface ChatSidebarProps {
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onSignOut: () => void;
  userEmail?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentChatId,
  onChatSelect,
  onNewChat,
  onSignOut,
  userEmail
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

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
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all chats

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

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
          <Button
            onClick={onNewChat}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {userEmail && (
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span className="truncate">{userEmail}</span>
            <Button
              onClick={onSignOut}
              variant="ghost"
              size="sm"
              className="ml-2 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Delete All Chats Button */}
        {chats.length > 0 && (
          <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All History
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  Delete All Chat History
                </DialogTitle>
                <DialogDescription>
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

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs">Start a conversation to see it here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    currentChatId === chat.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className={`p-1 rounded ${
                      chat.is_article ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {chat.is_article ? (
                        <FileText className="h-4 w-4 text-green-600" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {truncateTitle(chat.title)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(chat.updated_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={(e) => deleteChat(chat.id, e)}
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;
