
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateSuggestedQuestions } from '@/utils/questionGenerator';
import { toast } from 'sonner';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Generate consistent fake IDs for testing
const FAKE_USER_ID = 'test-user-12345';
const FAKE_SESSION_ID = 'test-session-67890';

export const useChatManager = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSendMessage = async (text: string) => {
    console.log('Sending message:', text);
    setIsLoading(true);
    setShowSuggestions(false);

    // Create and immediately display user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // Generate a chat ID if we don't have one
      let chatId = currentChatId;
      if (!chatId) {
        chatId = 'chat-' + Date.now();
        setCurrentChatId(chatId);
        console.log('Generated new chat ID:', chatId);
      }

      console.log('Calling webhook handler with:', {
        question: text,
        userId: FAKE_USER_ID,
        chatId: chatId,
        sessionId: FAKE_SESSION_ID
      });

      const { data, error } = await supabase.functions.invoke('webhook-handler', {
        body: {
          question: text,
          userId: FAKE_USER_ID,
          chatId: chatId,
          sessionId: FAKE_SESSION_ID
        }
      });

      if (error) {
        console.error('Webhook error:', error);
        throw new Error(`Failed to get AI response: ${error.message}`);
      }

      console.log('Webhook response data:', data);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || data.answer || 'Sorry, I could not generate a response.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Generate contextual questions using the new system
      try {
        const { generateContextualQuestions } = await import('@/utils/contextualQuestions');
        const questions = await generateContextualQuestions(aiMessage.text, messages);
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

    } catch (error) {
      console.error('Error handling message:', error);
      toast.error(`Failed to send message: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    console.log('Suggestion clicked:', question);
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

  return {
    messages,
    currentChatId,
    isLoading,
    suggestedQuestions,
    showSuggestions,
    handleSendMessage,
    handleSuggestionClick,
    handleNewChat,
    handleChatSelect,
    setMessages,
    setCurrentChatId,
    setSuggestedQuestions,
    setShowSuggestions
  };
};
