
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
import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Brain, Send, Mic, MicOff } from "lucide-react";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

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
  const [selectedVoice, setSelectedVoice] = useState<'James' | 'Cassidy' | 'Drew' | 'Lavender'>('Drew');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  // Form state moved from ChatBot
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        setIsListening(false);
        toast.success('Voice input captured!');
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Voice input failed. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

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

  const speakTextWithElevenLabs = async (text: string) => {
    try {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
      }

      setIsPlaying(true);
      console.log(`Attempting TTS with ElevenLabs - Voice: ${selectedVoice}, Text length: ${text.length}`);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text,
          voice: selectedVoice,
          userId: user?.id
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'TTS service error');
      }

      if (!data || !data.audio) {
        console.error('No audio data received from TTS service');
        throw new Error('No audio data received');
      }

      const audioBlob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setCurrentAudio(audio);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        toast.error('Audio playback failed');
      };

      await audio.play();
      toast.success(`Playing with ${selectedVoice} voice...`);

    } catch (error) {
      console.error('TTS error:', error);
      setIsPlaying(false);
      setCurrentAudio(null);
      
      const errorMessage = error.message || 'Failed to generate speech';
      toast.error(`TTS Error: ${errorMessage}`);
      
      if (errorMessage.includes('API key')) {
        toast.error('ElevenLabs API key not configured. Please check your settings.');
      }
    }
  };

  const handlePlayLatestResponse = async () => {
    const aiMessages = messages.filter(msg => !msg.isUser);
    const latestResponse = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1] : null;
    
    if (latestResponse) {
      await speakTextWithElevenLabs(latestResponse.text);
    } else {
      toast.error('No AI response to play');
    }
  };

  const handlePauseAudio = () => {
    if (currentAudio && isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
      setCurrentAudio(null);
      toast.info('Audio paused');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      text: question.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setQuestion('');

    console.log("Sending request to n8n webhook:", {
      question: userMessage.text,
      sessionId
    });

    try {
      const response = await fetch('https://sreen8n.app.n8n.cloud/webhook/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.text,
          sessionId: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received response from n8n:", data);

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        text: data.answer || data.response || data.message || 'Sorry, I could not generate a response.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      toast.success("Response received!");

    } catch (error) {
      console.error('Error calling n8n webhook:', error);
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: 'Sorry, I encountered an error while processing your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to get response from AI");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
      toast.info('Listening... Speak now!');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-row h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      <style>
        {`
          .chat-scrollbar::-webkit-scrollbar {
            width: 10px;
          }
          .chat-scrollbar::-webkit-scrollbar-track {
            background: #f3f4f6;
          }
          .dark .chat-scrollbar::-webkit-scrollbar-track {
            background: #1f2937;
          }
          .chat-scrollbar::-webkit-scrollbar-thumb {
            background: #4b5563;
            border-radius: 5px;
          }
          .chat-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #374151;
          }
          .dark .chat-scrollbar::-webkit-scrollbar-thumb {
            background: #6b7280;
          }
          .dark .chat-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
          .chat-scrollbar {
            scrollbar-width: thin;
          }
        `}
      </style>

      {/* Sidebar Container */}
      <div className="w-80 flex-shrink-0 h-screen">
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

      {/* Content Area Container */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header in Content Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">NeuroHeart.AI</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mindfulness Assistant</p>
            </div>
          </div>
        </div>

        {/* Main Content in Content Area */}
        <div className="flex-1 overflow-y-auto chat-scrollbar min-h-0">
          <ChatBot 
            messages={messages}
            setMessages={setMessages}
            sessionId={sessionId}
            setSessionId={setSessionId}
            speakText={speakTextWithElevenLabs}
            copyToClipboard={copyToClipboard}
          />
        </div>

        {/* Bottom Bar in Content Area */}
        <div className="p-4 bg-gray-200 dark:bg-gray-800 flex-shrink-0">
          <Card className="border-blue-200 dark:border-gray-600 shadow-lg bg-white dark:bg-gray-700">
            <form onSubmit={handleSubmit} className="p-4">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className="min-h-[60px] resize-none border-blue-200 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <Button
                    type="button"
                    onClick={isListening ? stopVoiceInput : startVoiceInput}
                    variant={isListening ? "destructive" : "outline"}
                    className="h-auto px-3 py-3"
                    disabled={isLoading}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !question.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-3 h-auto"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
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
