import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Auth from '@/components/Auth';
import ChatBot from '@/components/ChatBot';
import ChatSidebar from '@/components/ChatSidebar';
import LoadingIndicator from '@/components/LoadingIndicator';
import SuggestedQuestions from '@/components/SuggestedQuestions';
import DisclaimerModal from '@/components/DisclaimerModal';
import { useAuth } from '@/hooks/useAuth';
import { useUserAgreement } from '@/hooks/useUserAgreement';
import { supabase } from '@/integrations/supabase/client';
import { generateSuggestedQuestions } from '@/utils/questionGenerator';
import { toast } from 'sonner';

const queryClient = new QueryClient();

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  is_article: boolean;
  created_at: string;
  updated_at: string;
}

function AppContent() {
  const { user, loading } = useAuth();
  const { hasAgreed, showModal, handleAgree } = useUserAgreement();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'James' | 'Cassidy' | 'Drew' | 'Lavender'>('James');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        // You can implement a search or command palette here
        alert('Command palette not implemented yet!');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (currentChatId) {
      loadChatMessages(currentChatId);
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

      // Generate suggestions based on the last AI response if messages exist
      if (loadedMessages.length > 0) {
        const lastAiMessage = loadedMessages
          .filter(msg => !msg.isUser)
          .pop();
        
        if (lastAiMessage) {
          const questions = generateSuggestedQuestions(lastAiMessage.text);
          setSuggestedQuestions(questions);
          setShowSuggestions(true);
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

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      let chatId = currentChatId;

      // Create new chat if none exists
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

      // Save user message
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

      // Get Supabase URL and anon key for the edge function call
      const supabaseUrl = supabase.supabaseUrl;
      const supabaseKey = supabase.supabaseKey;

      console.log('Calling webhook handler with:', {
        question: text,
        chatId: chatId,
        userId: user.id
      });

      // Call webhook for AI response with correct endpoint and payload
      const response = await fetch(`${supabaseUrl}/functions/v1/webhook-handler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          question: text,
          chatId: chatId,
          userId: user.id
        }),
      });

      console.log('Webhook response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook error response:', errorText);
        throw new Error(`Failed to get AI response: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Webhook response data:', data);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || data.answer || 'Sorry, I could not generate a response.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Generate and show suggested questions
      const questions = generateSuggestedQuestions(aiMessage.text);
      setSuggestedQuestions(questions);
      setShowSuggestions(true);

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
    }
  };

  const handleSuggestionClick = (question: string) => {
    console.log('Suggestion clicked:', question);
    setShowSuggestions(false);
    // Auto-send the question immediately
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setMessages([]);
      setCurrentChatId(null);
      setSuggestedQuestions([]);
      setShowSuggestions(false);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const handlePlayLatestResponse = async () => {
    const aiMessages = messages.filter(msg => !msg.isUser);
    const latestResponse = aiMessages[aiMessages.length - 1];
    
    if (!latestResponse) {
      toast.error('No AI response to play');
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(false);
    }

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: latestResponse.text,
          voice: selectedVoice
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
        toast.error('Failed to play audio');
      };

      setCurrentAudio(audio);
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
      setIsPlaying(false);
    }
  };

  const handlePauseAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSpeak = (text: string) => {
    handlePlayLatestResponse();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingIndicator message="Loading application..." />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!hasAgreed) {
    return <DisclaimerModal isOpen={showModal} onAgree={handleAgree} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <ChatSidebar
        currentChatId={currentChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onSignOut={handleSignOut}
        userEmail={user?.email}
        messages={messages}
        onPlayLatestResponse={handlePlayLatestResponse}
        onPauseAudio={handlePauseAudio}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        isPlaying={isPlaying}
      />
      
      <div className="flex-1 flex flex-col">
        <ChatBot
          messages={messages}
          onSendMessage={handleSendMessage}
          onCopy={handleCopy}
          onSpeak={handleSpeak}
          isLoading={isLoading}
          loadingIndicator={<LoadingIndicator message="Processing with AI model..." />}
          suggestedQuestions={
            <SuggestedQuestions
              questions={suggestedQuestions}
              onQuestionClick={handleSuggestionClick}
              isVisible={showSuggestions}
            />
          }
          onSuggestionClick={handleSuggestionClick}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
