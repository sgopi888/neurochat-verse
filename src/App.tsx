
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
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'James' | 'Cassidy' | 'Drew' | 'Lavender'>('Drew');
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Set the document title
  useEffect(() => {
    document.title = 'Neuroheart.AI Mindfulness Coach';
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
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

  // Comprehensive audio cleanup function
  const stopCurrentAudio = () => {
    if (currentAudio) {
      console.log('Stopping current audio');
      currentAudio.pause();
      currentAudio.currentTime = 0;
      
      // Remove all event listeners
      currentAudio.removeEventListener('play', () => {});
      currentAudio.removeEventListener('ended', () => {});
      currentAudio.removeEventListener('error', () => {});
      
      // Revoke the object URL to free memory
      if (currentAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(currentAudio.src);
      }
      
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  };

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
    
    // Close mobile sidebar when sending a message
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

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

      console.log('Calling webhook handler with:', {
        question: text,
        chatId: chatId,
        userId: user.id
      });

      const { data, error } = await supabase.functions.invoke('webhook-handler', {
        body: {
          question: text,
          chatId: chatId,
          userId: user.id
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

      const questions = generateSuggestedQuestions(aiMessage.text);
      setSuggestedQuestions(questions);
      setShowSuggestions(true);

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
    handleSendMessage(question);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setSuggestedQuestions([]);
    setShowSuggestions(false);
    // Close mobile sidebar when starting new chat
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
    console.log('Started new chat');
  };

  const handleChatSelect = (chatId: string) => {
    if (chatId !== currentChatId) {
      setCurrentChatId(chatId);
      setShowSuggestions(false);
      // Close mobile sidebar when selecting a chat
      if (isMobile) {
        setIsMobileSidebarOpen(false);
      }
      console.log('Selected chat:', chatId);
    }
  };

  const handleSignOut = async () => {
    try {
      // Stop any playing audio before signing out
      stopCurrentAudio();
      
      await supabase.auth.signOut();
      setMessages([]);
      setCurrentChatId(null);
      setSuggestedQuestions([]);
      setShowSuggestions(false);
      setIsMobileSidebarOpen(false);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Enhanced audio management with proper overlap prevention
  const handlePlayLatestResponse = async () => {
    const aiMessages = messages.filter(msg => !msg.isUser);
    const latestResponse = aiMessages[aiMessages.length - 1];
    
    if (!latestResponse) {
      toast.error('No AI response to play');
      return;
    }

    // Always stop current audio first - this prevents overlaps
    console.log('Play button pressed - stopping any existing audio');
    stopCurrentAudio();

    try {
      console.log('Calling TTS with voice:', selectedVoice, 'and text length:', latestResponse.text.length);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: latestResponse.text,
          voice: selectedVoice,
          userId: user?.id
        }
      });

      if (error) {
        console.error('TTS error:', error);
        throw new Error(error.message || 'Failed to generate speech');
      }

      if (!data.audio) {
        throw new Error('No audio data received');
      }

      // Convert base64 to audio blob
      const audioBlob = new Blob([
        Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))
      ], { type: 'audio/mpeg' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Set up comprehensive event listeners
      const handlePlay = () => {
        console.log('Audio started playing');
        setIsPlaying(true);
      };
      
      const handleEnded = () => {
        console.log('Audio finished playing');
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      const handleError = (e: Event) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
        toast.error('Failed to play audio');
      };

      audio.addEventListener('play', handlePlay);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      // Store the audio reference BEFORE playing
      setCurrentAudio(audio);
      
      console.log('Starting audio playback');
      await audio.play();
      
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  };

  const handlePauseAudio = () => {
    console.log('Pause button pressed');
    stopCurrentAudio();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSpeak = (text: string) => {
    handlePlayLatestResponse();
  };

  const toggleMobileSidebar = () => {
    console.log('Toggling mobile sidebar. Current state:', isMobileSidebarOpen);
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
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
      {/* Desktop/Tablet Sidebar - Hidden on mobile */}
      <div className={`${isMobile ? 'hidden' : 'block'}`}>
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
      </div>

      {/* Mobile Sidebar Overlay - Only visible when open on mobile */}
      {isMobile && isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="fixed left-0 top-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out">
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
          </div>
        </>
      )}
      
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
          isMobile={isMobile}
          onToggleMobileSidebar={toggleMobileSidebar}
          isMobileSidebarOpen={isMobileSidebarOpen}
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
