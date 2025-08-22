import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserAgreement } from '@/hooks/useUserAgreement';
import { GPTService } from '@/services/gptService';
import { useConfigManager } from '@/hooks/useConfigManager';
import { generateContextualQuestions } from '@/utils/contextualQuestions';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sources?: { url: string; title: string }[];
  responseTime?: number;
  progress?: Array<{ step: string; status: 'pending' | 'processing' | 'completed'; details?: string }>;
}

interface ChatMode {
  mode: 'probing' | 'generating';
  probingMessages?: Message[]; // Optional for backward compatibility
}

export const useChatManager = () => {
  const { user } = useAuth();
  const { hasAgreed } = useUserAgreement();
  const { config } = useConfigManager();
  
  // Local state - single source of truth for current session
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentAbortController, setCurrentAbortController] = useState<AbortController | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>({ mode: 'probing', probingMessages: [] });
  const [isGeneratingMeditation, setIsGeneratingMeditation] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [chunksRetrieved, setChunksRetrieved] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [progress, setProgress] = useState(0);

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

  const loadChatMessages = async (chatId: string) => {
    if (!user) return;

    try {
      console.log('Loading messages for chat:', chatId);
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_session_id', chatId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading chat messages:', error);
        toast.error('Failed to load chat messages');
        return;
      }

      const loadedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.is_user,
        timestamp: new Date(msg.created_at)
      }));

      console.log('Loaded messages:', loadedMessages);
      setMessages(loadedMessages);

      if (loadedMessages.length > 0) {
        const lastAiMessage = loadedMessages
          .filter(msg => !msg.isUser)
          .pop();
        
        if (lastAiMessage) {
          try {
            const questions = await generateContextualQuestions(lastAiMessage.text, loadedMessages);
            setSuggestedQuestions(questions);
            setShowSuggestions(true);
          } catch (error) {
            console.error('Error generating contextual questions:', error);
            // Fallback to basic questions
            setSuggestedQuestions([
              "Can you tell me more about this topic?",
              "How can I apply this in my daily life?",
              "What other techniques might be helpful?"
            ]);
            setShowSuggestions(true);
          }
        }
      }

    } catch (error) {
      console.error('Error in loadChatMessages:', error);
      toast.error('Failed to load chat messages');
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!user || !hasAgreed) return;

    console.log('Sending message:', text);
    setIsLoading(true);
    setShowSuggestions(false);
    
    // Reset progress tracking
    setProcessingStep('');
    setChunksRetrieved(0);
    setTotalTokens(0);
    setProgress(0);

    // Create and immediately show user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };

    // CRITICAL: Add user message to state immediately for instant UI feedback
    setMessages(prev => [...prev, userMessage]);
    
    // Start progress tracking
    setProcessingStep('Analyzing your message...');
    setProgress(10);

    try {
      let chatId = currentChatId;

      if (!chatId) {
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
          console.error('Error creating chat session:', chatError);
          toast.error('Failed to create chat session');
          setIsLoading(false);
          return;
        }

        chatId = newChat.id;
        setCurrentChatId(chatId);
        console.log('Created new chat session:', chatId);
      }

      // Save user message to database in background
      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          chat_session_id: chatId,
          user_id: user.id,
          content: text,
          is_user: true
        });

      if (userMsgError) {
        console.error('Error saving user message:', userMsgError);
        toast.error('Failed to save message');
      }

      // Update progress
      setProcessingStep('Checking configuration...');
      setProgress(30);
      
      // Check if RAG is enabled using centralized config
      const ragEnabled = config.mode === 'rag';
      
      console.log('🔍 RAG Check - using centralized config:', {
        ragEnabled,
        mode: config.mode
      });
      
      // For RAG mode, use the new simplified approach
      let retrievedChunks: string[] = [];
      if (ragEnabled) {
        try {
          setProcessingStep('Extracting key concepts...');
          console.log('🎯 RAG: Starting simplified RAG retrieval...');
          
          retrievedChunks = await GPTService.getRagChunks(text, user.id, config.mode);
          
          if (retrievedChunks.length > 0) {
            console.log('✅ RAG: Successfully retrieved chunks:', retrievedChunks.length);
            setProcessingStep(`Found ${retrievedChunks.length} relevant documents`);
          } else {
            console.log('⚠️ RAG: No chunks retrieved');
            setProcessingStep('No relevant documents found');
          }
        } catch (error) {
          console.error('❌ RAG: Error during retrieval:', error);
          setProcessingStep('RAG: Retrieval failed');
        }
      }

      // Update progress
      setProcessingStep('Getting AI response...');
      setProgress(60);
      
      // Get AI response - use RAG method if RAG is enabled, regardless of chunks
      let response;
      if (ragEnabled) {
        console.log('🎯 RAG: Calling probingChatWithChunks (RAG enabled)');
        response = await GPTService.probingChatWithChunks(text, messages, retrievedChunks, user.id);
      } else {
        console.log('💬 Regular: Calling probingChat (RAG disabled)');
        response = await GPTService.probingChat(text, messages, user.id);
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get AI response');
      }
      
      // Update progress
      setProcessingStep('Processing response...');
      setProgress(80);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data || 'I understand. Please tell me more.',
        isUser: false,
        timestamp: new Date(),
        sources: response.sources,
        responseTime: response.responseTime
      };

      // Add AI message to state immediately
      setMessages(prev => [...prev, aiMessage]);

      // Save AI message to database in background
      try {
        const { error: aiMsgError } = await supabase
          .from('chat_messages')
          .insert({
            chat_session_id: chatId,
            user_id: user.id,
            content: aiMessage.text,
            is_user: false
          });

        if (aiMsgError) {
          console.error('Error saving AI message:', aiMsgError);
          toast.error('Failed to save AI response');
        } else {
          console.log('AI message saved successfully');
        }
      } catch (saveError) {
        console.error('Error in AI message save:', saveError);
        toast.error('Failed to save AI response to history');
      }

      // Complete progress
      setProgress(100);
      setProcessingStep('');
      
      // Clear old suggested questions before setting new ones
      setSuggestedQuestions([]);
      setShowSuggestions(false);
      
      // Use integrated follow-up questions from the response
      if (response.followUpQuestions && response.followUpQuestions.length > 0) {
        // Small delay to ensure clean state transition
        setTimeout(() => {
          setSuggestedQuestions(response.followUpQuestions);
          setShowSuggestions(true);
        }, 100);
      } else {
        // Fallback to basic questions if none were generated
        setTimeout(() => {
          setSuggestedQuestions([
            "Can you tell me more about this topic?",
            "How can I apply this in my daily life?",
            "What other techniques might be helpful?"
          ]);
          setShowSuggestions(true);
        }, 100);
      }

      // Update chat session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

    } catch (error) {
      console.error('Error handling message:', error);
      toast.error(`Failed to send message: ${error.message}`);
    } finally {
      setIsLoading(false);
      setProcessingStep('');
      setProgress(0);
    }
  };

  const generateMeditationScript = async () => {
    if (!user || !hasAgreed || messages.length === 0) return;

    setIsGeneratingMeditation(true);
    setIsLoading(true);
    setProcessingStep('Analyzing your conversation...');
    setProgress(10);

    try {
      // Extract keywords from conversation
      toast.info('Analyzing your conversation...');
      const keywordResponse = await GPTService.extractKeywords(messages, user.id);
      
      if (!keywordResponse.success) {
        throw new Error(keywordResponse.error || 'Failed to analyze conversation');
      }

      const keywords = keywordResponse.data || '';
      console.log('Extracted keywords:', keywords);

      // Update progress
      setProcessingStep('Finding relevant guidance...');
      setProgress(40);

      // Get relevant chunks
      toast.info('Finding relevant guidance...');
      
      if (!currentChatId) {
        throw new Error('No chat session found');
      }

      let retrievedChunks = '';
      let chunkCount = 0;

      try {
        // Check if RAG is enabled using centralized config
        if (config.mode === 'rag') {
          const { data: chunksData, error: chunksError } = await supabase.functions.invoke('chunks-retrieval', {
            body: {
              chatHistory: messages,
              userMessage: `${messages[messages.length - 1]?.text || ''} Keywords: ${keywords}`
            }
          });

          if (chunksError) {
            console.warn('Chunks retrieval failed, continuing without reference documents:', chunksError.message);
            toast.info('Generating from conversation history (reference service unavailable)');
            setProcessingStep('Skipping reference documents (service unavailable)');
          } else if (chunksData?.chunks && chunksData.chunks.length > 0) {
            retrievedChunks = chunksData.chunks.join('\n\n---\n\n');
            chunkCount = chunksData.chunks.length;
            
            // Show excerpt from chunks
            const firstChunk = chunksData.chunks[0];
            const excerpt = firstChunk.length > 150 ? 
              firstChunk.substring(0, 150) + '...' : firstChunk;
            
            toast.success(`Found ${chunkCount} relevant references: "${excerpt}"`);
            console.log(`Retrieved ${chunkCount} chunks for meditation generation`);
          } else {
            console.log('No chunks retrieved, generating from conversation only');
            toast.info('No specific references found, generating from conversation');
          }
        } else {
          console.log('RAG is disabled, generating from conversation only');
          toast.info('Generating from conversation history (RAG disabled)');
        }
      } catch (error) {
        console.error('Error retrieving chunks:', error);
        toast.info('Generating from conversation history (reference service unavailable)');
        setProcessingStep('Skipping reference documents (service unavailable)');
      }

      setChunksRetrieved(chunkCount);
      setProgress(70);

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

      // Complete progress
      setProcessingStep('Finalizing your meditation...');
      setProgress(90);

      const meditationScript = meditationResponse.data || 'Your personalized meditation script.';
      
      const meditationMessage: Message = {
        id: (Date.now() + 2).toString(),
        text: meditationScript,
        isUser: false,
        timestamp: new Date(),
        responseTime: meditationResponse.responseTime
      };

      // Add meditation script to state immediately
      setMessages(prev => [...prev, meditationMessage]);
      
      // Save meditation script to database in background
      await supabase
        .from('chat_messages')
        .insert({
          chat_session_id: currentChatId,
          user_id: user.id,
          content: meditationScript,
          is_user: false
        });

      // Update chat session timestamp
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentChatId);

      console.log('Meditation script saved to database');
      
      // Clear old suggested questions and generate new ones based on meditation
      setSuggestedQuestions([]);
      setShowSuggestions(false);
      
      // Generate follow-up questions for the meditation
      setTimeout(() => {
        setSuggestedQuestions([
          "Can you guide me through this meditation step by step?",
          "How often should I practice this meditation?",
          "What other meditation techniques might complement this one?"
        ]);
        setShowSuggestions(true);
      }, 100);
      
      setProgress(100);
      toast.success('Your personalized meditation is ready!');

    } catch (error) {
      console.error('Error generating meditation:', error);
      toast.error(`Failed to generate meditation: ${error.message}`);
    } finally {
      setIsGeneratingMeditation(false);
      setIsLoading(false);
      setProcessingStep('');
      setProgress(0);
    }
  };

  const handleSuggestionClick = (question: string) => {
    console.log('Suggestion clicked:', question);
    // Clear suggestions immediately to prevent old ones from showing
    setSuggestedQuestions([]);
    setShowSuggestions(false);
    handleSendMessage(question);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setSuggestedQuestions([]);
    setShowSuggestions(false);
    console.log('Started new chat');
  };

  const handleChatSelect = (chatId: string) => {
    if (chatId !== currentChatId) {
      setCurrentChatId(chatId);
      setShowSuggestions(false);
      console.log('Selected chat:', chatId);
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
  const canGenerateMeditation = messages.length > 0 && !isGeneratingMeditation && config.mode === 'rag';
  const canStopOperation = isLoading || isGeneratingMeditation;

  const deleteChat = () => {
    // This will be handled by useChatHistory
    console.log('Delete chat not implemented in useChatManager');
  };

  return {
    messages,
    currentChatId,
    isLoading,
    suggestedQuestions,
    showSuggestions,
    chatMode,
    isGeneratingMeditation,
    processingStep,
    chunksRetrieved,
    totalTokens,
    progress,
    
    // Actions
    handleSendMessage,
    generateMeditationScript,
    handleSuggestionClick,
    handleNewChat,
    handleChatSelect,
    deleteChat,
    stopCurrentOperation,
    
    // Computed
    canGenerateMeditation,
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