import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Bot, Mic, MicOff, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import MessageBubble from './MessageBubble';
import ChatSidebar from './ChatSidebar';
import SuggestedQuestions from './SuggestedQuestions';
import { useAuth } from '@/hooks/useAuth';

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

const EnhancedChatBot = () => {
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<'Rachel' | 'Cassidy'>('Rachel');
  const [isPlayingLatest, setIsPlayingLatest] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Voice IDs for ElevenLabs
  const voiceIds = {
    Rachel: 'CwhRBWXzGAHq8TQ4Fs17',
    Cassidy: '9BWtsMINqrJLrRacOk9x'
  };

  useEffect(() => {
    initializeSpeechRecognition();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
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
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: text,
          voice: selectedVoice
        }
      });

      if (error) {
        throw error;
      }

      // Convert base64 to blob and play
      const audioBlob = new Blob([Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.play();
      toast.success('Playing audio...');
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

    } catch (error) {
      console.error('TTS error:', error);
      toast.error('Failed to generate speech');
      
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
        toast.success('Playing audio (fallback)...');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex">
      <ChatSidebar
        currentChatId={currentChat?.id || null}
        onChatSelect={loadChatMessages}
        onNewChat={handleNewChat}
        onSignOut={signOut}
        userEmail={user?.email}
        messages={messages}
        onPlayLatestResponse={handlePlayLatestResponse}
        selectedVoice={selectedVoice}
        onVoiceChange={setSelectedVoice}
        isPlaying={isPlayingLatest}
      />

      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b border-blue-100 shadow-sm flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">NeuroChat</h1>
                  <p className="text-gray-600">Powered by NeuroHeart.AI</p>
                </div>
              </div>
              <Button
                onClick={handleNewChat}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <RotateCcw className="h-4 w-4" />
                <span>New Chat</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Messages Container - Scrollable */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full px-4 py-6">
              <div className="space-y-4 mb-6">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Bot className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Welcome to the NeuroHeart.AI Mindfulness App</h3>
                    <p className="text-gray-500">Ask me anything about mindfulness, meditation, or mental wellness!</p>
                  </div>
                )}

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
                  <div className="flex justify-start">
                    <div className="bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3 max-w-xs">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-5 w-5 text-gray-600" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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

          {/* Input Form - Fixed at bottom */}
          <div className="flex-shrink-0 max-w-4xl mx-auto w-full px-4 pb-6">
            <Card className="border-blue-200 shadow-lg">
              <form onSubmit={handleSubmit} className="p-4">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything..."
                      className="min-h-[60px] resize-none border-blue-200 focus:border-blue-400 focus:ring-blue-400"
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
    </div>
  );
};

export default EnhancedChatBot;
