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

interface ChatMode {
  mode: 'probing' | 'generating';
  probingMessages: Message[];
}

export const useEnhancedChatManager = () => {
  const { user } = useAuth();
  const { hasAgreed } = useUserAgreement();
  
  // Persistent state (saved to DB)
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  // Chat session management
  const [chatSessions, setChatSessions] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Stop functionality
  const [currentAbortController, setCurrentAbortController] = useState<AbortController | null>(null);
  
  // Enhanced state for dual-mode chat
  const [chatMode, setChatMode] = useState<ChatMode>({
    mode: 'probing',
    probingMessages: []
  });
  const [isGeneratingMeditation, setIsGeneratingMeditation] = useState(false);

  // 🔧 PERSISTENCE: Restore currentChatId from localStorage on mount
  useEffect(() => {
    if (user) {
      const savedChatId = localStorage.getItem(`currentChatId_${user.id}`);
      if (savedChatId) {
        console.log('📱 Restored currentChatId from localStorage:', savedChatId);
        setCurrentChatId(savedChatId);
      }
      loadChatSessions();
    }
  }, [user]);

  // Load chat sessions from database
  const loadChatSessions = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Loading chat sessions for user:', user.id);
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading chat sessions:', error);
        toast.error('Failed to load chat sessions');
        return;
      }

      setChatSessions(data || []);
      console.log('✅ Loaded chat sessions:', data?.length || 0, 'sessions');
    } catch (error) {
      console.error('❌ Error in loadChatSessions:', error);
      toast.error('Failed to load chat sessions');
    }
  };

  // Load chat messages from database
  useEffect(() => {
    if (currentChatId) {
      console.log('🔄 Loading messages for chatId:', currentChatId);
      loadChatMessages(currentChatId);
    } else {
      console.log('🔄 No currentChatId, clearing messages');
      setMessages([]);
      setChatMode({ mode: 'probing', probingMessages: [] });
    }
  }, [currentChatId]);

  const loadChatMessages = async (chatId: string) => {
    if (!user) return;

    try {
      console.log('🔍 Loading messages for chatId:', chatId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_session_id', chatId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading chat messages:', error);
        toast.error('Failed to load chat messages');
        return;
      }

      if (!data || data.length === 0) {
        console.log('📝 No messages found for chatId:', chatId);
        setMessages([]);
        setChatMode({ mode: 'probing', probingMessages: [] });
        return;
      }

      const loadedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.is_user,
        timestamp: new Date(msg.created_at)
      }));

      setMessages(loadedMessages);
      console.log('✅ Loaded messages:', loadedMessages.length, 'messages');
      
      // Only reset probing messages if this is a different chat or if it's a completed meditation chat
      const hasMeditationContent = loadedMessages.some(msg => 
        !msg.isUser && msg.text.toLowerCase().includes('meditation script')
      );
      
      if (hasMeditationContent) {
        console.log('🧘 Found meditation content, resetting probing mode');
        setChatMode({ mode: 'probing', probingMessages: [] });
        setSuggestedQuestions([]);
        setShowSuggestions(false);
      } else {
        // This is an active probing chat, clear probing messages for clean state
        console.log('💬 Active probing chat, clearing probing messages');
        setChatMode({ mode: 'probing', probingMessages: [] });

        // Generate contextual questions from the last AI message in loaded chat
        const lastAiMessage = loadedMessages
          .filter(msg => !msg.isUser)
          .pop();
        
        if (lastAiMessage) {
          try {
            console.log('🔄 Generating contextual questions for loaded chat');
            const questions = await generateContextualQuestions(lastAiMessage.text, loadedMessages);
            setSuggestedQuestions(questions);
            setShowSuggestions(true);
          } catch (error) {
            console.error('❌ Error generating contextual questions for loaded chat:', error);
            setSuggestedQuestions([]);
            setShowSuggestions(false);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error in loadChatMessages:', error);
      toast.error('Failed to load chat messages');
    }
  };

  // Stop current operation
  const stopCurrentOperation = () => {
    if (currentAbortController) {
      currentAbortController.abort();
      setCurrentAbortController(null);
    }
    setIsLoading(false);
    setIsGeneratingMeditation(false);
    toast.info('Operation stopped');
  };

  // Handle probing chat (now persisted to database)
  const handleProbingMessage = async (text: string) => {
    if (!user || !hasAgreed) return;

    // Create abort controller for this operation
    const abortController = new AbortController();
    setCurrentAbortController(abortController);
    setIsLoading(true);
    setShowSuggestions(false);

    // Create chat session on first probing message if none exists
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

        if (chatError) {
          throw new Error('Failed to create chat session');
        }

        chatId = newChat.id;
        setCurrentChatId(chatId);
        
        // 🔧 PERSISTENCE: Save to localStorage
        if (user) {
          localStorage.setItem(`currentChatId_${user.id}`, chatId);
          console.log('💾 Saved new chatId to localStorage:', chatId);
        }
        
        // 🔄 Refresh chat sessions to show new chat
        loadChatSessions();
      } catch (error) {
        console.error('Error creating chat session:', error);
        toast.error('Failed to create chat session');
        setIsLoading(false);
        setCurrentAbortController(null);
        return;
      }
    }

    // Add user message to probing conversation
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };

    const updatedProbingMessages = [...chatMode.probingMessages, userMessage];
    setChatMode(prev => ({
      ...prev,
      probingMessages: updatedProbingMessages
    }));

    // 🔧 IMMEDIATE PERSISTENCE: Save user message to database right away
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
      console.log('✅ User message saved to database immediately');
    } catch (dbError) {
      console.error('❌ Error saving user message to database:', dbError);
      toast.error('Failed to save message');
      setIsLoading(false);
      setCurrentAbortController(null);
      return;
    }

    try {
      // Check if operation was aborted
      if (abortController.signal.aborted) return;
      
      // Get GPT-5 probing response  
      const response = await GPTService.probingChat(text, chatMode.probingMessages, user.id);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get AI response');
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data || 'I understand. Please tell me more.',
        isUser: false,
        timestamp: new Date()
      };

      setChatMode(prev => ({
        ...prev,
        probingMessages: [...updatedProbingMessages, aiMessage]
      }));

      // Save AI response to database (user message already saved)
      try {
        await supabase
          .from('chat_messages')
          .insert({
            chat_session_id: chatId,
            user_id: user.id,
            content: aiMessage.text,
            is_user: false,
            timestamp: aiMessage.timestamp.toISOString()
          });
        console.log('✅ AI response saved to database');

        // Update chat session timestamp
        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId);
      } catch (dbError) {
        console.error('Error saving messages to database:', dbError);
      }

      // Generate contextual questions after probing response
    try {
      // Pass the full conversation context for better question generation
      const allMessages = [...chatMode.probingMessages, aiMessage];
      const contextualQuestions = await generateContextualQuestions(response.data || '', allMessages);
      setSuggestedQuestions(contextualQuestions);
      setShowSuggestions(true);
    } catch (questionError) {
      console.error('Error generating contextual questions:', questionError);
      // Fallback to static questions
      setSuggestedQuestions([
        "Can you tell me more about that?",
        "How has this been affecting my daily life?",
        "What would help me feel better about this situation?"
      ]);
      setShowSuggestions(true);
    }

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error in probing chat:', error);
        // User message is already saved, just show error for AI response
        toast.error(`AI response failed: ${error.message}`);
        
        // Show fallback message in UI to indicate AI failed
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm having trouble responding right now. Your message has been saved. Please try asking again.",
          isUser: false,
          timestamp: new Date()
        };
        setChatMode(prev => ({
          ...prev,
          probingMessages: [...updatedProbingMessages, errorMessage]
        }));
      }
    } finally {
      setCurrentAbortController(null);
      setIsLoading(false);
    }
  };

  // Generate meditation script using full pipeline
  const generateMeditationScript = async () => {
    if (!user || !hasAgreed || chatMode.probingMessages.length === 0) return;

    // Create abort controller for this operation
    const abortController = new AbortController();
    setCurrentAbortController(abortController);
    setIsGeneratingMeditation(true);
    setIsLoading(true);

    try {
      // Step 1: Extract keywords from probing conversation
      toast.info('Analyzing your conversation...');
      const keywordResponse = await GPTService.extractKeywords(chatMode.probingMessages, user.id);
      
      if (!keywordResponse.success) {
        throw new Error(keywordResponse.error || 'Failed to analyze conversation');
      }

      const keywords = keywordResponse.data || '';
      console.log('Extracted keywords:', keywords);

      // Step 2: Get relevant chunks from N8N using existing webhook
      toast.info('Finding relevant guidance...');
      
      // Chat session should already exist from probing, but check just in case
      let chatId = currentChatId;
      if (!chatId) {
        throw new Error('No chat session found. Please start a conversation first.');
      }

      // Call existing webhook with keywords as question
      const { data: webhookData, error: webhookError } = await supabase.functions.invoke('webhook-handler', {
        body: {
          question: keywords, // Map keywords to existing question field
          chatId: chatId,
          userId: user.id
        }
      });

      if (webhookError) {
        throw new Error(`Failed to retrieve guidance: ${webhookError.message}`);
      }

      const retrievedChunks = webhookData.response || '';
      console.log('Retrieved chunks length:', retrievedChunks.length);

      // Step 3: Generate meditation script using conversation + chunks
      toast.info('Creating your personalized meditation...');
      
      const meditationResponse = await GPTService.generateMeditationScript(
        chatMode.probingMessages, 
        retrievedChunks, 
        user.id
      );

      if (!meditationResponse.success) {
        throw new Error(meditationResponse.error || 'Failed to generate meditation');
      }

      const meditationScript = meditationResponse.data || 'Your personalized meditation script.';
      
      // Step 4: Save conversation and meditation to database
      const allMessages = [
        ...chatMode.probingMessages,
        {
          id: Date.now().toString(),
          text: meditationScript,
          isUser: false,
          timestamp: new Date()
        }
      ];

      // Save all messages to database
      for (const msg of allMessages) {
        await supabase
          .from('chat_messages')
          .insert({
            chat_session_id: chatId,
            user_id: user.id,
            content: msg.text,
            is_user: msg.isUser
          });
      }

      // Update UI state - merge instead of replacing to prevent reload appearance
      setMessages(prev => {
        // If we already have messages, just add the new meditation script
        if (prev.length > 0) {
          return [...prev, allMessages[allMessages.length - 1]]; // Add just the meditation script
        }
        return allMessages; // First time, set all messages
      });
      setChatMode({ mode: 'probing', probingMessages: [] }); // Reset for next conversation
      
      // Update chat session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      toast.success('Your personalized meditation is ready!');

    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error generating meditation:', error);
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
    if (chatMode.mode === 'probing') {
      handleProbingMessage(question);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setChatMode({ mode: 'probing', probingMessages: [] });
    setSuggestedQuestions([]);
    setShowSuggestions(false);
    setIsGeneratingMeditation(false);
    
    // 🔧 PERSISTENCE: Clear from localStorage
    if (user) {
      localStorage.removeItem(`currentChatId_${user.id}`);
      console.log('🗑️ Cleared currentChatId from localStorage');
    }
    
    console.log('➕ Started new chat');
  };

  const handleChatSelect = (chatId: string) => {
    if (chatId !== currentChatId) {
      console.log('🔄 Selecting chat:', chatId, 'from current:', currentChatId);
      
      setCurrentChatId(chatId);
      setShowSuggestions(false);
      setIsGeneratingMeditation(false);
      
      // 🔧 PERSISTENCE: Save to localStorage
      if (user) {
        localStorage.setItem(`currentChatId_${user.id}`, chatId);
        console.log('💾 Saved chatId to localStorage:', chatId);
      }
      
      console.log('✅ Selected chat:', chatId);
    }
  };

    return {
    // Persistent state
    messages,
    currentChatId,
    chatSessions,
    
    // UI state
    isLoading,
    suggestedQuestions,
    showSuggestions,
    
    // Enhanced state
    chatMode,
    isGeneratingMeditation,
    
    // Actions
    handleProbingMessage,
    generateMeditationScript,
    handleSuggestionClick,
    handleNewChat,
    handleChatSelect,
    stopCurrentOperation,
    loadChatSessions, // 🔄 Export for external refresh
    
    // Computed values
    allDisplayMessages: [...messages, ...chatMode.probingMessages],
    canGenerateMeditation: chatMode.probingMessages.length > 0 && !isGeneratingMeditation,
    canStopOperation: isLoading || isGeneratingMeditation,
    
    // Legacy compatibility
    handleSendMessage: handleProbingMessage,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions,
    setShowSuggestions
  };
};