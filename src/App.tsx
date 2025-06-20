
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

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
    // Placeholder for fetching messages for the selected chat
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
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex text-gray-900 dark:text-gray-100 overflow-hidden">
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
  );
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
