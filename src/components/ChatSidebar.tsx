import React from 'react';
import { useChatHistory } from '@/hooks/useChatHistory';
import { useEnhancedChatManager } from '@/hooks/useEnhancedChatManager';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  className?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ className }) => {
  const { chatSessions, isLoading, deleteChat, refreshChatHistory } = useChatHistory(
    useEnhancedChatManager().currentChatId,
    useEnhancedChatManager().handleChatSelect
  );
  const { currentChatId, handleNewChat } = useEnhancedChatManager();

  return (
    <div className={cn('w-64 bg-gray-100 p-4 overflow-y-auto', className)}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Chat History</h2>
        <Button onClick={handleNewChat} variant="outline" size="sm">
          New Chat
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : chatSessions.length === 0 ? (
        <p className="text-gray-500">No chats available</p>
      ) : (
        <div className="space-y-2">
          {chatSessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'p-2 rounded cursor-pointer flex justify-between items-center',
                currentChatId === session.id ? 'bg-blue-100' : 'hover:bg-gray-200'
              )}
              onClick={() => {
                console.log('Sidebar: Selecting chat:', session.id);
                handleChatSelect(session.id);
              }}
            >
              <div>
                <p className="text-sm font-medium">{session.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(session.updated_at).toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Deleting chat:', session.id);
                  deleteChat(session.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        onClick={() => {
          console.log('Refreshing chat history');
          refreshChatHistory();
        }}
        variant="ghost"
        className="mt-4 w-full"
      >
        Refresh
      </Button>
    </div>
  );
};

export default ChatSidebar;