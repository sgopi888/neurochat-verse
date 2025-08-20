import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserAgreement } from '@/hooks/useUserAgreement';
import { GPTService } from '@/services/gptService';
import { generateContextualQuestions } from '@/utils/contextualQuestions';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
}

interface ChatMode {
  mode: 'probing' | 'generating';
  probingMessages?: Message[]; // Optional for backward compatibility
}

export const useChatManager = () => {
  const { user } = useAuth();
  const { hasAgreed } = useUserAgreement();
  
  // Single source of truth - everything from database
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && user) {
      return localStorage.getItem(`currentChatId_${user.id}`) || null;
    }
    return null;
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentAbortController, setCurrentAbortController] = useState<AbortController | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>({ mode: 'probing', probingMessages: [] });
  const [isGeneratingMeditation, setIsGeneratingMeditation] = useState(false);

  // Real-time subscriptions for automatic updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to chat sessions changes
    const sessionsChannel = supabase
      .channel('chat-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('🔄 Chat sessions updated, refreshing...');
          loadChatSessions();
        }
      )
      .subscribe();

    // Subscribe to messages changes for current chat
    let messagesChannel: any = null;
    if (currentChatId) {
      messagesChannel = supabase
        .channel('chat-messages-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_session_id=eq.${currentChatId}`
          },
          () => {
            console.log('🔄 Messages updated, refreshing...');
            loadChatMessages(currentChatId);
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(sessionsChannel);
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel);
      }
    };
  }, [user, currentChatId]);

  // Load data on user change
  useEffect(() => {
    if (user) {
      // Restore currentChatId from localStorage
      const savedChatId = localStorage.getItem(`currentChatId_${user.id}`);
      if (savedChatId && savedChatId !== currentChatId) {
        setCurrentChatId(savedChatId);
      }
      loadChatSessions();
    } else {
      // Clear state when user logs out
      setMessages([]);
      setChatSessions([]);
      setCurrentChatId(null);
      setSuggestedQuestions([]);
      setShowSuggestions(false);
    }
  }, [user]);

  // Load messages when chat changes
  useEffect(() => {
    if (currentChatId) {
      loadChatMessages(currentChatId);
    } else {
      setMessages([]);
      setSuggestedQuestions([]);
      setShowSuggestions(false);
    }
  }, [currentChatId]);

  const loadChatSessions = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Loading chat sessions...');
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setChatSessions(data || []);
      console.log('✅ Loaded chat sessions:', data?.length || 0);
    } catch (error) {
      console.error('❌ Error loading chat sessions:', error);
      toast.error('Failed to load chat sessions');
    }
  };

  const loadChatMessages = async (chatId: string) => {
    if (!user) return;

    try {
      console.log('🔄 Loading messages for chat:', chatId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_session_id', chatId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.is_user,
        timestamp: new Date(msg.created_at)
      }));

      setMessages(loadedMessages);
      console.log('✅ Loaded messages:', loadedMessages.length);

      // Generate contextual questions if there are messages
      const lastAiMessage = loadedMessages.filter(msg => !msg.isUser).pop();
      if (lastAiMessage && !lastAiMessage.text.toLowerCase().includes('meditation script')) {
        try {
          const questions = await generateContextualQuestions(lastAiMessage.text, loadedMessages);
          setSuggestedQuestions(questions);
          setShowSuggestions(true);
        } catch (error) {
          console.error('❌ Error generating questions:', error);
          setSuggestedQuestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestedQuestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!user || !hasAgreed) return;

    const abortController = new AbortController();
    setCurrentAbortController(abortController);
    setIsLoading(true);
    setShowSuggestions(false);

    // Create chat session if none exists
    let chatId = currentChatId;
    if (!chatId) {
      try {
        const chatTitle = text.length > 50 ? text.substring(0, 50) + '...' : text;
        
        const { data: newChat, error: chatError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: chatTitle,
            is_article: false
          })
          .select()
          .single();

        if (chatError) throw chatError;

        chatId = newChat.id;
        setCurrentChatId(chatId);
        localStorage.setItem(`currentChatId_${user.id}`, chatId);
        console.log('✅ Created new chat:', chatId);
      } catch (error) {
        console.error('❌ Error creating chat:', error);
        toast.error('Failed to create chat session');
        setIsLoading(false);
        setCurrentAbortController(null);
        return;
      }
    }

    // Save user message immediately to database
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };

    try {
      await supabase
        .from('chat_messages')
        .insert({
          chat_session_id: chatId,
          user_id: user.id,
          content: userMessage.text,
          is_user: true,
          timestamp: userMessage.timestamp.toISOString()
        });
      console.log('✅ User message saved to database');
    } catch (error) {
      console.error('❌ Error saving user message:', error);
      toast.error('Failed to save message');
      setIsLoading(false);
      setCurrentAbortController(null);
      return;
    }

    try {
      // Get AI response
      if (abortController.signal.aborted) return;
      
      const response = await GPTService.probingChat(text, messages, user.id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get AI response');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data || 'I understand. Please tell me more.',
        isUser: false,
        timestamp: new Date()
      };

      // Save AI response to database
      await supabase
        .from('chat_messages')
        .insert({
          chat_session_id: chatId,
          user_id: user.id,
          content: aiMessage.text,
          is_user: false,
          timestamp: aiMessage.timestamp.toISOString()
        });

      // Update chat session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      console.log('✅ AI response saved to database');
      
      // Messages will be updated via real-time subscription
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Error getting AI response:', error);
        toast.error(`AI response failed: ${error.message}`);
        
        // Save error message to database
        try {
          await supabase
            .from('chat_messages')
            .insert({
              chat_session_id: chatId,
              user_id: user.id,
              content: "I'm having trouble responding right now. Please try asking again.",
              is_user: false,
              timestamp: new Date().toISOString()
            });
        } catch (dbError) {
          console.error('❌ Error saving error message:', dbError);
        }
      }
    } finally {
      setCurrentAbortController(null);
      setIsLoading(false);
    }
  };

  const generateMeditationScript = async () => {
    if (!user || !hasAgreed || messages.length === 0) return;

    const abortController = new AbortController();
    setCurrentAbortController(abortController);
    setIsGeneratingMeditation(true);
    setIsLoading(true);

    try {
      // Extract keywords from conversation
      toast.info('Analyzing your conversation...');
      const keywordResponse = await GPTService.extractKeywords(messages, user.id);
      
      if (!keywordResponse.success) {
        throw new Error(keywordResponse.error || 'Failed to analyze conversation');
      }

      const keywords = keywordResponse.data || '';
      console.log('✅ Extracted keywords:', keywords);

      // Get relevant chunks
      toast.info('Finding relevant guidance...');
      
      if (!currentChatId) {
        throw new Error('No chat session found');
      }

      const { data: webhookData, error: webhookError } = await supabase.functions.invoke('webhook-handler', {
        body: {
          question: keywords,
          chatId: currentChatId,
          userId: user.id
        }
      });

      if (webhookError) {
        throw new Error(`Failed to retrieve guidance: ${webhookError.message}`);
      }

      const retrievedChunks = webhookData.response || '';
      console.log('✅ Retrieved chunks:', retrievedChunks.length, 'characters');

      // Generate meditation script
      toast.info('Creating your personalized meditation...');
      
      const meditationResponse = await GPTService.generateMeditationScript(
        messages, 
        retrievedChunks, 
        user.id
      );

      if (!meditationResponse.success) {
        throw new Error(meditationResponse.error || 'Failed to generate meditation');
      }

      const meditationScript = meditationResponse.data || 'Your personalized meditation script.';
      
      // Save meditation script to database
      await supabase
        .from('chat_messages')
        .insert({
          chat_session_id: currentChatId,
          user_id: user.id,
          content: meditationScript,
          is_user: false,
          timestamp: new Date().toISOString()
        });

      // Update chat session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentChatId);

      console.log('✅ Meditation script saved to database');
      toast.success('Your personalized meditation is ready!');

      // Messages will be updated via real-time subscription
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Error generating meditation:', error);
        toast.error(`Failed to generate meditation: ${error.message}`);
      }
    } finally {
      setCurrentAbortController(null);
      setIsGeneratingMeditation(false);
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    setShowSuggestions(false);
    handleSendMessage(question);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setSuggestedQuestions([]);
    setShowSuggestions(false);
    setIsGeneratingMeditation(false);
    
    if (user) {
      localStorage.removeItem(`currentChatId_${user.id}`);
    }
    
    console.log('✅ Started new chat');
  };

  const handleChatSelect = (chatId: string) => {
    if (chatId !== currentChatId) {
      setCurrentChatId(chatId);
      setShowSuggestions(false);
      setIsGeneratingMeditation(false);
      
      if (user) {
        localStorage.setItem(`currentChatId_${user.id}`, chatId);
      }
      
      console.log('✅ Selected chat:', chatId);
    }
  };

  const deleteChat = async (chatId: string) => {
    if (!user) return;

    try {
      console.log('🗑️ Deleting chat:', chatId);
      
      // Delete messages first
      await supabase
        .from('chat_messages')
        .delete()
        .eq('chat_session_id', chatId)
        .eq('user_id', user.id);

      // Delete chat session
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id);

      // If this was the current chat, clear it
      if (chatId === currentChatId) {
        handleNewChat();
      }

      toast.success('Chat deleted successfully');
      console.log('✅ Chat deleted:', chatId);
    } catch (error) {
      console.error('❌ Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const stopCurrentOperation = () => {
    if (currentAbortController) {
      currentAbortController.abort();
      setCurrentAbortController(null);
    }
    setIsLoading(false);
    setIsGeneratingMeditation(false);
    toast.info('Operation stopped');
  };

  // Computed values
  const canStopOperation = isLoading || isGeneratingMeditation;

  return {
    // State
    messages,
    chatSessions,
    currentChatId,
    isLoading,
    suggestedQuestions,
    showSuggestions,
    chatMode,
    isGeneratingMeditation,
    
    // Actions
    handleSendMessage,
    generateMeditationScript,
    handleSuggestionClick,
    handleNewChat,
    handleChatSelect,
    deleteChat,
    stopCurrentOperation,
    
    // Computed
    canGenerateMeditation: messages.length > 0 && !isGeneratingMeditation,
    canStopOperation,
    allDisplayMessages: messages, // Now it's just messages since everything is in DB
    
    // Legacy compatibility
    handleProbingMessage: handleSendMessage,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions,
    setShowSuggestions,
    isLoadingHistory: false // Chat sessions load immediately via real-time
  };
};