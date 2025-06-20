
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Auth from "@/components/Auth";
import ChatSidebar from "@/components/ChatSidebar";
import ChatBot from "@/components/ChatBot";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Brain } from "lucide-react";

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

const ChatApp = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    const newSessionId = `user_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    localStorage.setItem('neuroheart-session-id', newSessionId);
    localStorage.removeItem('neuroheart-chat-history');
  };

  const handleChatSelect = async (chatId: string) => {
    setCurrentChatId(chatId);
    
    try {
      // Fetch messages for the selected chat
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (messagesData) {
        const formattedMessages: Message[] = messagesData.map(msg => ({
          id: msg.id,
          text: msg.content,
          isUser: msg.is_user,
          timestamp: new Date(msg.created_at)
        }));
        
        setMessages(formattedMessages);
        localStorage.setItem('neuroheart-chat-history', JSON.stringify(formattedMessages));
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const handleSignOut = async () => {
    setMessages([]);
    setCurrentChatId(null);
    setSessionId('');
    localStorage.removeItem('neuroheart-session-id');
    localStorage.removeItem('neuroheart-chat-history');
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex flex-col text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Full-width Header Bar */}
      <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">NeuroHeart.AI</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Mindfulness Assistant</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {user?.email && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Welcome, {user.email.split('@')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar 
          currentChatId={currentChatId}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          onSignOut={handleSignOut}
          userEmail={user?.email}
          messages={messages}
          onPlayLatestResponse={speakText}
          selectedVoice="Rachel"
          onVoiceChange={() => {}}
          isPlaying={false}
        />
        <ChatBot 
          messages={messages}
          setMessages={setMessages}
          sessionId={sessionId}
          setSessionId={setSessionId}
        />
      </div>
    </div>
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return <ChatApp />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
