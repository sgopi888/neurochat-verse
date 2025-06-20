import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Bot, Mic, MicOff, RotateCcw, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import MessageBubble from './MessageBubble';
import ChatSidebar from './ChatSidebar';
import SuggestedQuestions from './SuggestedQuestions';
import DisclaimerModal from './DisclaimerModal';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeProvider } from '@/contexts/ThemeContext';

interface Message {
  id: string;
  content: string;
  is_user: boolean;
  created_at: Date;
}

interface Chat {
  id: string;
  title: string;
  is_article: boolean;
}

const EnhancedChatBotContent = () => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<'Rachel' | 'Cassidy'>('Rachel');
  const [isPlayingLatest, setIsPlayingLatest] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Voice IDs for ElevenLabs
  const voiceIds = {
    Rachel: 'kqVT88a5QfII1HNAEPTJ',
    Cassidy: '9BWtsMINqrJLrRacOk9x'
  };

  useEffect(() => {
    initializeSpeechRecognition();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const initializeSpeechRecognition = () => {
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

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast.error('Voice input failed. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewChat = async (firstMessage: string, isArticle: boolean = false) => {
    try {
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...' 
        : firstMessage;

      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: user?.id,
          title,
          is_article: isArticle
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating chat:', error);
        return null;
      }

      setCurrentChat(data);
      return data.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  };

  const saveMessage = async (chatId: string, content: string, isUser: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          user_id: user?.id,
          content,
          is_user: isUser
        });

      if (error) {
        console.error('Error saving message:', error);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const formattedMessages = data.map(msg => ({
        id: msg.id,
        content: msg.content,
        is_user: msg.is_user,
        created_at: new Date(msg.created_at)
      }));

      setMessages(formattedMessages);
      
      // Load chat details
      const { data: chatData } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatData) {
        setCurrentChat(chatData);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: question.trim(),
      is_user: true,
      created_at: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    let chatId = currentChat?.id;
    
    // Create new chat if this is the first message
    if (!chatId) {
      chatId = await createNewChat(userMessage.content);
      if (!chatId) {
        toast.error('Failed to create chat');
        setIsLoading(false);
        return;
      }
    }

    // Save user message
    await saveMessage(chatId, userMessage.content, true);
    setQuestion('');

    try {
      const { data, error } = await supabase.functions.invoke('webhook-handler', {
        body: {
          question: userMessage.content,
          userId: user?.id,
          chatId: chatId,
          sessionId: user?.id
        }
      });

      if (error) {
        throw error;
      }

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        content: data.answer || data.response || data.message || 'Sorry, I could not generate a response.',
        is_user: false,
        created_at: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI message
      await saveMessage(chatId, aiMessage.content, false);

      // Set suggested questions from the response
      if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
        setSuggestedQuestions(data.suggestedQuestions);
      }

      toast.success("Response received!");

    } catch (error) {
      console.error('Error calling webhook:', error);
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: '🔴 I apologize, but I encountered an error while processing your request. This might be due to high server load or a temporary connectivity issue. Please try asking your question again in a few moments.',
        is_user: false,
        created_at: new Date()
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

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChat(null);
    setSuggestedQuestions([]);
    toast.success('New chat started!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const speakTextWithElevenLabs = async (text: string) => {
    try {
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

      // Convert base64 to blob and play
      const audioBlob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      console.log('Playing ElevenLabs generated audio');
      await audio.play();
      toast.success(`Playing with ${selectedVoice} voice...`);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        console.log('Audio playback completed');
      };

    } catch (error) {
      console.error('TTS error:', error);
      
      // Show specific error message
      const errorMessage = error.message || 'Failed to generate speech';
      toast.error(`TTS Error: ${errorMessage}`);
      
      // Don't fall back to browser TTS - let user know what went wrong
      if (errorMessage.includes('API key')) {
        toast.error('ElevenLabs API key not configured. Please check your settings.');
      }
    }
  };

  const handlePlayLatestResponse = async (text: string) => {
    setIsPlayingLatest(true);
    try {
      await speakTextWithElevenLabs(text);
    } finally {
      setIsPlayingLatest(false);
    }
  };

  const handleSuggestedQuestionClick = (question: string) => {
    setQuestion(question);
    setSuggestedQuestions([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex w-full transition-colors duration-200">
      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-50 md:hidden bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar */}
      <div className={`${
        isMobile 
          ? `fixed inset-y-0 left-0 z-40 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`
          : ''
      }`}>
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <ChatSidebar
          currentChatId={currentChat?.id || null}
          onChatSelect={(chatId) => {
            loadChatMessages(chatId);
            if (isMobile) setSidebarOpen(false);
          }}
          onNewChat={() => {
            handleNewChat();
            if (isMobile) setSidebarOpen(false);
          }}
          onSignOut={signOut}
          userEmail={user?.email}
          messages={messages}
          onPlayLatestResponse={handlePlayLatestResponse}
          selectedVoice={selectedVoice}
          onVoiceChange={setSelectedVoice}
          isPlaying={isPlayingLatest}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm flex-shrink-0 transition-colors duration-200">
          <div className="px-6 py-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-xl shadow-sm">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">NeuroChat</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered mindfulness companion</p>
                </div>
              </div>
              <Button
                onClick={handleNewChat}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 border-gray-300 dark:border-gray-600"
              >
                <RotateCcw className="h-4 w-4" />
                <span>New Chat</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Messages Container with Main Scrollbar */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto overflow-x-hidden main-chat-scroll">
            <div className="max-w-4xl mx-auto px-6 py-6">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 p-6 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-sm">
                    <Bot className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Welcome to NeuroChat</h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    Your AI-powered mindfulness companion. Ask me about meditation, mental wellness, or anything else on your mind.
                  </p>
                </div>
              )}

              <div className="space-y-0">
                {messages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={{
                      id: message.id,
                      text: message.content,
                      isUser: message.is_user,
                      timestamp: message.created_at
                    }}
                    onCopy={copyToClipboard}
                    onSpeak={speakTextWithElevenLabs}
                  />
                ))}

                {isLoading && (
                  <div className="flex justify-start mb-6">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions */}
              <SuggestedQuestions
                questions={suggestedQuestions}
                onQuestionClick={handleSuggestedQuestionClick}
                isVisible={!isLoading && messages.length > 0}
              />
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
          <div className="max-w-4xl mx-auto p-4">
            <Card className="border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800 transition-colors duration-200">
              <form onSubmit={handleSubmit} className="p-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Message NeuroChat..."
                      className={`min-h-[56px] max-h-32 resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 ${
                        isMobile ? 'text-base' : ''
                      }`}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      onClick={isListening ? stopVoiceInput : startVoiceInput}
                      variant={isListening ? "destructive" : "ghost"}
                      size="sm"
                      className={`h-10 w-10 p-0 ${isMobile ? 'h-12 w-12' : ''}`}
                      disabled={isLoading}
                    >
                      {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !question.trim()}
                      className={`bg-blue-600 hover:bg-blue-700 text-white h-10 w-10 p-0 ${
                        isMobile ? 'h-12 w-12' : ''
                      } ${!question.trim() ? 'opacity-50' : ''} transition-all duration-200`}
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
    </div>
  );
};

const EnhancedChatBot = () => {
  return (
    <ThemeProvider>
      <EnhancedChatBotContent />
    </ThemeProvider>
  );
};

export default EnhancedChatBot;
