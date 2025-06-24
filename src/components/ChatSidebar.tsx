
import React, { useState, useEffect } from 'react';
import { MessageSquare, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Chat {
  id: string;
  title: string;
  created_at: string;
}

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onPlayScript: () => void;
  onRefreshChats: () => void;
  isLoading?: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  currentChatId,
  onChatSelect,
  onNewChat,
  onPlayScript,
  onRefreshChats,
  isLoading = false
}) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const formatChatTitle = (title: string, createdAt: string) => {
    if (title && title.trim() !== '') {
      return title.length > 30 ? `${title.substring(0, 30)}...` : title;
    }
    return `Chat ${new Date(createdAt).toLocaleDateString()}`;
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Chat History</h2>
        
        {/* New Chat Button */}
        <Button
          onClick={onNewChat}
          className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          New Chat
        </Button>

        {/* Play Script Button */}
        <Button
          onClick={onPlayScript}
          variant="outline"
          className="w-full border-green-200 text-green-700 hover:bg-green-50"
          disabled={isLoading}
        >
          <Play className="h-4 w-4 mr-2" />
          Play Script
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onChatSelect(chat.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-gray-100 ${
                currentChatId === chat.id ? 'bg-blue-50 border border-blue-200' : ''
              }`}
            >
              <div className="text-sm font-medium text-gray-800 truncate">
                {formatChatTitle(chat.title, chat.created_at)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(chat.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
          
          {chats.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 text-sm py-8">
              No chats yet. Start a new conversation!
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Info */}
      {user && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600 truncate">
            {user.email}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;
