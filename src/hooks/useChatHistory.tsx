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

export const useChatHistory = (currentChatId: string | null) => {
  const { user } = useAuth();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChatHistory = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading chat history:', error);
        toast.error('Failed to load chat history');
        return;
      }

      setChatSessions(data || []);
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
      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Error in deleteChat:', error);
      toast.error('Failed to delete chat');
    }
  };

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  // Refresh when a new chat is created or when current chat changes
  useEffect(() => {
    if (currentChatId && !chatSessions.find(chat => chat.id === currentChatId)) {
      loadChatHistory();
    }
  }, [currentChatId]);

  // Refresh chat history periodically to show updated timestamps
  useEffect(() => {
    if (user && currentChatId) {
      const interval = setInterval(() => {
        loadChatHistory();
      }, 10000); // Refresh every 10 seconds when actively chatting
      
      return () => clearInterval(interval);
    }
  }, [user, currentChatId]);

  return {
    chatSessions,
    isLoading,
    deleteChat,
    refreshChatHistory: loadChatHistory
  };
};