import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
}

export const useChatHistory = (currentChatId: string | null, onChatSelect: (chatId: string) => void) => {
  const { user } = useAuth();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChatHistory = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      console.log('Loading chat history for user:', user.id);
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50); // Increased limit to ensure all chats are fetched

      if (error) {
        console.error('Error loading chat history:', error);
        toast.error('Failed to load chat history');
        return;
      }

      console.log('Loaded chat sessions:', data?.length || 0);
      setChatSessions(data || []);

      // Restore currentChatId from localStorage if not set
      if (!currentChatId && data?.length > 0) {
        const savedChatId = localStorage.getItem('currentChatId');
        if (savedChatId && data.find(chat => chat.id === savedChatId)) {
          console.log('Restoring currentChatId from localStorage:', savedChatId);
          onChatSelect(savedChatId);
        } else if (data[0]) {
          console.log('Setting default chatId to most recent:', data[0].id);
          onChatSelect(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error in loadChatHistory:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;

    try {
      console.log('Deleting chat:', chatId);
      // Delete messages first
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('chat_session_id', chatId)
        .eq('user_id', user.id);

      if (messagesError) {
        console.error('Error deleting messages:', messagesError);
        toast.error('Failed to delete chat messages');
        return;
      }

      // Delete chat session
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id);

      if (sessionError) {
        console.error('Error deleting chat session:', sessionError);
        toast.error('Failed to delete chat session');
        return;
      }

      // Update local state
      setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        onChatSelect(null); // Clear current chat if deleted
        localStorage.removeItem('currentChatId');
      }
      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Error in deleteChat:', error);
      toast.error('Failed to delete chat');
    }
  };

  // Load chat history on user change
  useEffect(() => {
    if (user) {
      loadChatHistory();
    } else {
      setChatSessions([]);
    }
  }, [user]);

  // Refresh when currentChatId changes (e.g., new chat created)
  useEffect(() => {
    if (user && currentChatId && !chatSessions.find(chat => chat.id === currentChatId)) {
      console.log('New chat detected, refreshing chat history');
      loadChatHistory();
    }
  }, [user, currentChatId, chatSessions]);

  // Periodic refresh for active chatting
  useEffect(() => {
    if (user && currentChatId) {
      const interval = setInterval(() => {
        console.log('Periodic chat history refresh');
        loadChatHistory();
      }, 15000); // Refresh every 15 seconds

      return () => clearInterval(interval);
    }
  }, [user, currentChatId]);

  return {
    chatSessions,
    isLoading,
    deleteChat,
    refreshChatHistory: loadChatHistory,
  };
};