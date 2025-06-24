import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Mic, Send, Loader2 } from 'lucide-react';
import { useSpeechToText } from 'react-speech-kit';
import { ScrollArea } from "@/components/ui/scroll-area"
import ChatSidebar from '@/components/ChatSidebar';
import UserSettings from '@/components/UserSettings';
import MessageBubble from '@/components/MessageBubble';
import SuggestedQuestions from '@/components/SuggestedQuestions';
import { generateContextualQuestions } from '@/utils/contextualQuestions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Settings } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from './integrations/supabase/client';
import ProcessingSteps from '@/components/ProcessingSteps';

const App = () => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isScriptPlaying, setIsScriptPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [audioLoadingStates, setAudioLoadingStates] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const { listen, listening, stop } = useSpeechToText({
    onResult: (result) => {
      setCurrentMessage(result);
    }
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadUserChats();
    }
  }, [user]);

  useEffect(() => {
    if (currentChatId) {
      loadChatMessages(currentChatId);
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  const loadUserChats = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChats(data);
    } catch (error: any) {
      toast({
        title: "Error loading chats",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
  };

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const playAudio = async (audioUrl: string) => {
    try {
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      toast({
        title: "Error playing audio",
        description: "Failed to play the audio message.",
        variant: "destructive",
      });
    }
  };

  const handlePlayScript = async () => {
    setIsScriptPlaying(true);
    for (const message of messages) {
      if (message.audio_url) {
        setAudioLoadingStates(prev => ({ ...prev, [message.id]: true }));
        try {
          await playAudio(message.audio_url);
          // Delay between audio messages (adjust as needed)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error("Error playing script:", error);
          toast({
            title: "Error playing script",
            description: "Failed to play one or more audio messages.",
            variant: "destructive",
          });
          break;
        } finally {
          setAudioLoadingStates(prev => ({ ...prev, [message.id]: false }));
        }
      }
    }
    setIsScriptPlaying(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !user) return;

    setIsProcessing(true);
    
    // Create user message object immediately
    const userMessage = {
      id: `temp-${Date.now()}`,
      content: content.trim(),
      is_user: true,
      created_at: new Date().toISOString(),
      chat_id: currentChatId || '',
      user_id: user.id
    };

    // Add user message to current messages immediately
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');

    try {
      let chatIdToUse = currentChatId;

      // Create new chat if needed
      if (!chatIdToUse) {
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert([{
            user_id: user.id,
            title: content.substring(0, 50)
          }])
          .select()
          .single();

        if (chatError) throw chatError;
        
        chatIdToUse = newChat.id;
        setCurrentChatId(chatIdToUse);
      }

      // Save user message to database
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatIdToUse,
          user_id: user.id,
          content: content.trim(),
          is_user: true
        }]);

      if (messageError) throw messageError;

      // Call webhook for AI response
      const { data, error } = await supabase.functions.invoke('webhook-handler', {
        body: {
          chatId: chatIdToUse,
          message: content.trim(),
          voice: selectedVoice
        }
      });

      if (error) throw error;

      // Refresh messages and chats
      await Promise.all([
        loadChatMessages(chatIdToUse),
        loadUserChats()
      ]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Remove the temporary user message on error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsProcessing(false);
    }
  };

  const LoadingIndicator = () => (
    <div className="flex justify-center items-center p-4">
      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      <span className="ml-2 text-gray-600">Loading...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex h-full">
        {/* Chat Sidebar */}
        <div className="w-64 border-r border-gray-200 bg-white">
          <ChatSidebar
            chats={chats}
            currentChatId={currentChatId}
            onChatSelect={handleChatSelect}
            onNewChat={handleNewChat}
            onPlayScript={handlePlayScript}
            onRefreshChats={loadUserChats}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onPlayAudio={message.audio_url ? () => playAudio(message.audio_url!) : undefined}
                isAudioLoading={audioLoadingStates[message.id] || false}
              />
            ))}
            
            {/* Processing Steps */}
            <ProcessingSteps isVisible={isProcessing} />
            
            {isLoading && <LoadingIndicator />}
          </div>

          {/* Suggested Questions */}
          <div className="px-4">
            <SuggestedQuestions
              onQuestionSelect={handleSendMessage}
              chatId={currentChatId || undefined}
              messages={messages}
              isVisible={messages.length === 0}
            />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <Textarea
                placeholder="Type your message..."
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                className="flex-1 resize-none border rounded-md focus:ring-blue-500 focus:border-blue-500"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(currentMessage);
                  }
                }}
              />
              <Button
                onClick={() => handleSendMessage(currentMessage)}
                disabled={!currentMessage.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        </div>

        {/* Settings Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" className="absolute top-4 right-4 rounded-full">
              <Settings className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>User Settings</SheetTitle>
              <SheetDescription>
                Manage your preferences and account settings here.
              </SheetDescription>
            </SheetHeader>
            <UserSettings
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
              onRefreshChats={loadUserChats}
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default App;
