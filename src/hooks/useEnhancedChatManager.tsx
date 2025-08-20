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
  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    return localStorage.getItem('currentChatId') || null; // Initialize from localStorage
  });
  
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

  // Load chat messages from database
  const loadChatMessages = async (chatId: string) => {
    if (!user) return;

    try {
      console.log('Loading messages for chatId:', chatId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_session_id', chatId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat messages:', error);
        toast.error('Failed to load chat messages');
        setMessages([]);
        return;
      }

      const loadedMessages: Message[] = data?.map(msg => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.is_user,
        timestamp: new Date(msg.created_at)
      })) || [];

      console.log('Loaded messages count:', loadedMessages.length);
      setMessages(loadedMessages);

      // Check for meditation content and generate contextual questions
      const hasMeditationContent = loadedMessages.some(
        msg => !msg.isUser && msg.text.toLowerCase().includes('meditation script')
      );

      if (hasMeditationContent) {
        console.log('Meditation content detected, resetting probing mode');
        setChatMode({ mode: 'probing', probingMessages: [] });
        setSuggestedQuestions([]);
        setShowSuggestions(false);
      } else if (loadedMessages.length > 0) {
        const lastAiMessage = loadedMessages.filter(msg => !msg.isUser).pop();
        if (lastAiMessage) {
          try {
            console.log('Generating contextual questions for loaded chat');
            const questions = await generateContextualQuestions(lastAiMessage.text, loadedMessages);
            setSuggestedQuestions(questions);
            setShowSuggestions(true);
          } catch (error) {
            console.error('Error generating contextual questions:', error);
            setSuggestedQuestions([]);
            setShowSuggestions(false);
          }
        }
      }
    } catch (error) {
      console.error('Error in loadChatMessages:', error);
      toast.error('Failed to load chat messages');
      setMessages([]);
    }
  };

  // Load messages when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      console.log('useEffect: Loading messages for currentChatId:', currentChatId);
      loadChatMessages(currentChatId);
    } else {
      console.log('useEffect: Clearing messages, no currentChatId');
      setMessages([]);
      setChatMode({ mode: 'probing', probingMessages: [] });
      setSuggestedQuestions([]);
      setShowSuggestions(false);
    }
  }, [currentChatId]);

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

    // Create chat session if none exists
    let chatId = currentChatId;
    if (!chatId) {
      try {
        const chatTitle = text.length > 50 ? text.substring(0, 50) + '...' : text;
        console.log('Creating new chat session with title:', chatTitle);
        
        const { data: newChat, error: chatError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            title: chatTitle,
            is_article: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (chatError) {
          throw new Error('Failed to create chat session: ' + chatError.message);
        }

        chatId = newChat.id;
        setCurrentChatId(chatId);
        localStorage.setItem('currentChatId', chatId);
        console.log('New chat created, chatId:', chatId);
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

      // Save both user and AI messages to database
      try {
        await supabase
          .from('chat_messages')
          .insert([
            {
              chat_session_id: chatId,
              user_id: user.id,
              content: userMessage.text,
              is_user: true,
              timestamp: userMessage.timestamp.toISOString(),
              created_at: new Date().toISOString()
            },
            {
              chat_session_id: chatId,
              user_id: user.id,
              content: aiMessage.text,
              is_user: false,
              timestamp: aiMessage.timestamp.toISOString(),
              created_at: new Date().toISOString()
            }
          ]);

        // Update chat session timestamp
        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId);
      } catch (dbError) {
        console.error('Error saving messages to database:', dbError);
        toast.error('Failed to save messages');
      }

      // Generate contextual questions
      try {
        const allMessages = [...chatMode.probingMessages, aiMessage];
        const contextualQuestions = await generateContextualQuestions(response.data || '', allMessages);
        setSuggestedQuestions(contextualQuestions);
        setShowSuggestions(true);
      } catch (questionError) {
        console.error('Error generating contextual questions:', questionError);
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
        toast.error(`Failed to get response: ${error.message}`);
      }
    } finally {
      setCurrentAbortController(null);
      setIsLoading(false);
    }
  };

  // Generate meditation script using full pipeline
  const generateMeditationScript = async () => {
    if (!user || !hasAgreed || chatMode.probingMessages.length === 0) return;

    const abortController = new AbortController();
    setCurrentAbortController(abortController);
    setIsGeneratingMeditation(true);
    setIsLoading(true);

    try {
      toast.info('Analyzing your conversation...');
      const keywordResponse = await GPTService.extractKeywords(chatMode.probingMessages, user.id);
      
      if (!keywordResponse.success) {
        throw new Error(keywordResponse.error || 'Failed to analyze conversation');
      }

      const keywords = keywordResponse.data || '';
      console.log('Extracted keywords:', keywords);

      toast.info('Finding relevant guidance...');
      const chatId = currentChatId;
      if (!chatId) {
        throw new Error('No chat session found. Please start a conversation first.');
      }

      const { data: webhookData, error: webhookError } = await supabase.functions.invoke('webhook-handler', {
        body: {
          question: keywords,
          chatId: chatId,
          userId: user.id
        }
      });

      if (webhookError) {
        throw new Error(`Failed to retrieve guidance: ${webhookError.message}`);
      }

      const retrievedChunks = webhookData.response || '';
      console.log('Retrieved chunks length:', retrievedChunks.length);

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
      const meditationMessage: Message = {
        id: Date.now().toString(),
        text: meditationScript,
        isUser: false,
        timestamp: new Date()
      };

      const allMessages = [...chatMode.probingMessages, meditationMessage];

      // Save all messages to database
      try {
        await supabase
          .from('chat_messages')
          .insert(
            allMessages.map(msg => ({
              chat_session_id: chatId,
              user_id: user.id,
              content: msg.text,
              is_user: msg.isUser,
              timestamp: msg.timestamp.toISOString(),
              created_at: new Date().toISOString()
            }))
          );

        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', chatId);
      } catch (dbError) {
        console.error('Error saving meditation messages:', dbError);
        toast.error('Failed to save meditation script');
      }

      setMessages(prev => [...prev, meditationMessage]);
      setChatMode({ mode: 'probing', probingMessages: [] });
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
    console.log('Starting new chat, clearing state');
    setCurrentChatId(null);
    setMessages([]);
    setChatMode({ mode: 'probing', probingMessages: [] });
    setSuggestedQuestions([]);
    setShowSuggestions(false);
    setIsGeneratingMeditation(false);
    localStorage.removeItem('currentChatId');
  };

  const handleChatSelect = (chatId: string | null) => {
    if (chatId !== currentChatId) {
      console.log('Selecting chat:', chatId);
      if (currentChatId && chatMode.probingMessages.length > 0) {
        console.log('Preserving probing messages for chat:', currentChatId);
      }
      setCurrentChatId(chatId);
      localStorage.setItem('currentChatId', chatId || '');
      setShowSuggestions(false);
      setIsGeneratingMeditation(false);
    }
  };

  return {
    messages,
    currentChatId,
    isLoading,
    suggestedQuestions,
    showSuggestions,
    chatMode,
    isGeneratingMeditation,
    handleProbingMessage,
    generateMeditationScript,
    handleSuggestionClick,
    handleNewChat,
    handleChatSelect,
    stopCurrentOperation,
    allDisplayMessages: [...messages, ...chatMode.probingMessages],
    canGenerateMeditation: chatMode.probingMessages.length > 0 && !isGeneratingMeditation,
    canStopOperation: isLoading || isGeneratingMeditation,
    handleSendMessage: handleProbingMessage,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions,
    setShowSuggestions
  };
};